/**
 * Which value-added products this installation is licensed to serve.
 *
 * GET /client/v1/service-status carries `value_added_services`, a list of
 * catalog codes, on the app-token tier. It replaces the hand-set per-brand
 * flags this app used to read (SD-1074). Those drifted from the licence in
 * both directions: a product switched on in the licence stayed invisible until
 * somebody edited a flag, and a product whose term had ended stayed on the
 * menu, offering screens that answer 404.
 *
 * Three things the field means, each easy to get wrong:
 *
 * - The list is what the installation can serve **right now**. A product whose
 *   term has ended is simply absent, exactly as its own endpoints are. There is
 *   no "licensed but expired" state, and there must not be one: a customer is
 *   never told about their operator's licensing.
 * - It carries **every** code the installation holds, including ones that drive
 *   operator-side work only. An unrecognised code is a product this app has no
 *   screens for, never an error.
 * - It is not cached in place of asking. Every launch asks.
 */

/** The codes this app has screens for. */
export const PRODUCT = Object.freeze({
    HOTELS: 'HOTELS',
    FLIGHTS: 'FLIGHTS',
    COUPONS: 'PROMOTIONAL-COUPONS',
    WALLETS: 'WALLETS',
});

/**
 * The rest of the catalog, listed so the next person knows these codes are
 * expected rather than junk: ESIM, REFERRAL-PROGRAM, AFFILIATE-PROGRAM,
 * BUDGET-CALCULATOR, BIRTHDAY-GREETINGS, BASE-RATE-FEEDER. This app implements
 * none of them today, and ignores them by saying nothing about them.
 */

/**
 * What to do on the launch where service status could not be reached at all.
 *
 * Hiding everything makes a network blip look like an unlicensed installation.
 * Showing everything offers screens that may 404. The choice here, made once so
 * no screen has to make it again: honour the last answer this browser received
 * from this installation, for as long as it is credible, and otherwise offer
 * nothing.
 *
 * Twelve hours is the limit. A licence ends on a date, so a remembered answer
 * can be wrong from the moment it expires; twelve hours bounds that to less
 * than a day while still covering any outage a customer would sit through. The
 * money path never depends on this list, so the cost of offering nothing is a
 * missing extra, not a customer who cannot send money.
 */
export const REMEMBERED_FOR_MS = 12 * 60 * 60 * 1000;

const STORAGE_PREFIX = 'licensedProducts:';

/**
 * Keyed by installation, so two brands opened in one browser cannot answer for
 * each other.
 *
 * @returns {string}
 */
function storageKey() {
    return STORAGE_PREFIX + (import.meta.env.VITE_APP_BASE_URL ?? 'default');
}

/**
 * @param {string[]} codes
 */
export function rememberProducts(codes) {
    try {
        localStorage.setItem(storageKey(), JSON.stringify({at: Date.now(), codes}));
    } catch {
        // A browser that refuses storage still works; it just cannot fall back.
    }
}

/**
 * The last answer this browser received, if it is still credible.
 *
 * @param {number} [now]
 * @returns {string[]|null}
 */
export function rememberedProducts(now = Date.now()) {
    let raw;
    try {
        raw = localStorage.getItem(storageKey());
    } catch {
        return null;
    }
    if (! raw) return null;

    try {
        const {at, codes} = JSON.parse(raw);
        if (! Array.isArray(codes) || typeof at !== 'number') return null;
        if (now - at > REMEMBERED_FOR_MS || now < at) return null;

        return codes;
    } catch {
        return null;
    }
}

export function forgetProducts() {
    try {
        localStorage.removeItem(storageKey());
    } catch {
        // nothing to forget
    }
}
