import {computed, reactive, readonly} from "vue";
import axios from "axios";
import {serviceStatusEnabled} from "@/feature_flags.js";
import {logRequestFailure} from "@/composables/api_utils.js";

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
 * Behind VITE_SERVICE_STATUS_ENABLED (default off): with the flag off nothing
 * is requested and the banner never renders.
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
}

/**
 * Ask the API again. Safe to call from anywhere (a 412 handler, a resume);
 * concurrent calls share one request, and a failed read leaves the last
 * known answer in place rather than pretending the service is down.
 *
 * @returns {Promise<void>}
 */
export async function refreshServiceStatus() {
    if (! serviceStatusEnabled()) {
        return;
    }
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
        })
        .finally(() => {
            inFlight = null;
        });

    return inFlight;
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
    if (started || ! serviceStatusEnabled()) {
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
}

export function useServiceStatus() {
    return {
        status: readonly(state),
        isAvailable: computed(() => state.isAvailable),
        activeWindow: computed(() => state.activeWindow),
        upcomingWindow: computed(() => state.upcomingWindow),
        isFrozen: (action) => isActionFrozen(action),
        refresh: refreshServiceStatus,
        start: startServiceStatusWatch,
    };
}
