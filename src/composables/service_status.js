import {computed, reactive, readonly} from "vue";
import axios from "axios";
import {logRequestFailure} from "@/composables/api_utils.js";
import {rememberProducts, rememberedProducts} from "@/licensed_products.js";

/**
 * GET /client/v1/service-status: whether the platform is taking customer
 * activity, and any maintenance window running or declared for later.
 *
 * The Client API reference asks the client to poll it on launch, on resume
 * from the background, and after any 412 refusal of type
 * active_transfer_disable_rule (that refusal and this endpoint describe the
 * same window). is_available is the one field to branch on; the window
 * objects are for what is shown around that decision. expected_to_end_at is
 * an expectation, never a promise: nothing here counts down to it.
 *
 * This call is not optional any more. It also carries value_added_services,
 * the products the installation is licensed to serve, which is how the app
 * decides what to offer (SD-1074). VITE_SERVICE_STATUS_ENABLED used to decide
 * whether to ask at all; it now decides only whether the maintenance banner
 * renders, because a deployment that hides the banner still has to know what
 * it may show.
 */

// The customer actions a window can name. Absent from a legacy record means
// every one of them.
export const CUSTOMER_ACTIONS = Object.freeze({
    NEW_TRANSFERS: 'NEW-TRANSFERS',
    TRANSFER_PAYMENTS: 'TRANSFER-PAYMENTS',
    WALLET_TOPUPS: 'WALLET-TOPUPS',
    VAS_ORDERS: 'VAS-ORDERS',
});

// While the service is unavailable, ask again this often so the banner
// clears itself once operations end the window.
const RECHECK_MS = 60_000;

const state = reactive({
    loaded: false,
    isAvailable: true,
    activeWindow: null,
    upcomingWindow: null,
    // Empty until an answer arrives. Offering nothing is the safe direction:
    // a product that appears late is a missing extra, a product that appears
    // without a licence is a screen that 404s.
    products: [],
    productsKnown: false,
});

let inFlight = null;
let recheckId = null;
let started = false;

/**
 * @param {object|null} raw a window object from the API
 * @returns {{message: string, startsAt: string|null, expectedToEndAt: string|null, affectedActions: string[]|null}|null}
 */
export function parseWindow(raw) {
    if (! raw) return null;

    return {
        message: raw.message ?? '',
        startsAt: raw.starts_at ?? null,
        expectedToEndAt: raw.expected_to_end_at ?? null,
        // null means "not declared", which the reference says to read as
        // every customer action.
        affectedActions: Array.isArray(raw.affected_actions) ? raw.affected_actions : null,
    };
}

/**
 * Whether this installation is licensed to serve a product right now.
 *
 * False until an answer arrives, and false for a code the list does not carry.
 * There is deliberately no third state: a customer is never shown that a
 * product exists but their operator's licence for it has ended.
 *
 * @param {string} code one of PRODUCT
 * @returns {boolean}
 */
export function offersProduct(code) {
    return state.products.includes(code);
}

/**
 * Resolves once the first read has settled, either with an answer or with the
 * remembered one. The router waits on this so a deep link into a product page
 * is judged against a licence rather than against an empty list.
 *
 * @returns {Promise<void>}
 */
export function productsSettled() {
    if (state.productsKnown) {
        return Promise.resolve();
    }

    return (inFlight ?? refreshServiceStatus()).catch(() => {});
}

/**
 * Whether the active window stops one customer action.
 *
 * @param {string} action one of CUSTOMER_ACTIONS
 * @param {{isAvailable: boolean, activeWindow: object|null}} [snapshot] defaults to the shared state
 * @returns {boolean}
 */
export function isActionFrozen(action, snapshot = state) {
    if (snapshot.isAvailable || ! snapshot.activeWindow) {
        return false;
    }
    const actions = snapshot.activeWindow.affectedActions;
    if (actions === null || actions.length === 0) {
        return true;
    }

    return actions.includes(action);
}

/**
 * @param {object} data the endpoint's JSON body
 */
export function applyServiceStatus(data) {
    state.loaded = true;
    state.isAvailable = data?.is_available !== false;
    state.activeWindow = parseWindow(data?.active_window);
    state.upcomingWindow = parseWindow(data?.upcoming_window);

    // Every code the installation holds arrives, including ones that drive
    // operator-side work only. Unknown codes are products this app has no
    // screens for, so they are carried and simply never asked about.
    const codes = Array.isArray(data?.value_added_services) ? data.value_added_services : [];
    state.products = codes;
    state.productsKnown = true;
    rememberProducts(codes);
}

/**
 * Ask the API again. Safe to call from anywhere (a 412 handler, a resume);
 * concurrent calls share one request, and a failed read leaves the last
 * known answer in place rather than pretending the service is down.
 *
 * @returns {Promise<void>}
 */
export async function refreshServiceStatus() {
    if (inFlight) {
        return inFlight;
    }
    inFlight = axios.get('/client/v1/service-status', {skipAuthRedirect: true, skipMfaRedirect: true})
        .then((response) => {
            applyServiceStatus(response.data);
            scheduleRecheck();
        })
        .catch((e) => {
            logRequestFailure(e, 'service-status');
            fallBackToRememberedProducts();
        })
        .finally(() => {
            inFlight = null;
        });

    return inFlight;
}

/**
 * The launch where the call could not be reached at all.
 *
 * The choice is made in licensed_products.js and made once: honour the last
 * answer this browser had from this installation while it is still credible,
 * and otherwise offer nothing. Only fills a gap - a live answer is never
 * replaced by a remembered one.
 */
function fallBackToRememberedProducts() {
    if (state.productsKnown) {
        return;
    }
    const remembered = rememberedProducts();
    if (remembered) {
        state.products = remembered;
        state.productsKnown = true;
    }
}

function scheduleRecheck() {
    if (recheckId) {
        clearTimeout(recheckId);
        recheckId = null;
    }
    if (! state.isAvailable) {
        recheckId = setTimeout(() => {
            recheckId = null;
            refreshServiceStatus();
        }, RECHECK_MS);
    }
}

function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
        refreshServiceStatus();
    }
}

/**
 * Start watching: one read now, one on every return to the tab. Idempotent.
 */
export function startServiceStatusWatch() {
    if (started) {
        return;
    }
    started = true;
    document.addEventListener('visibilitychange', onVisibilityChange);
    refreshServiceStatus();
}

/**
 * Test hook: forget everything, including listeners.
 */
export function resetServiceStatus() {
    started = false;
    inFlight = null;
    if (recheckId) {
        clearTimeout(recheckId);
        recheckId = null;
    }
    document.removeEventListener('visibilitychange', onVisibilityChange);
    state.loaded = false;
    state.isAvailable = true;
    state.activeWindow = null;
    state.upcomingWindow = null;
    state.products = [];
    state.productsKnown = false;
}

export function useServiceStatus() {
    return {
        status: readonly(state),
        isAvailable: computed(() => state.isAvailable),
        activeWindow: computed(() => state.activeWindow),
        upcomingWindow: computed(() => state.upcomingWindow),
        isFrozen: (action) => isActionFrozen(action),
        products: computed(() => state.products),
        offers: offersProduct,
        productsKnown: computed(() => state.productsKnown),
        refresh: refreshServiceStatus,
        start: startServiceStatusWatch,
    };
}
