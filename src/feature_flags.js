/**
 * Boolean deployment flags, parsed in one place.
 *
 * Vite inlines `import.meta.env` at build time and hands every variable over as
 * a string, so `VITE_THING=false` is truthy unless something parses it. Reading
 * a flag inline is how a deployment ends up with a feature it asked to turn off.
 */

/**
 * @param {*} value the raw import.meta.env value
 * @param {boolean} fallback used when the variable is unset or empty
 * @returns {boolean}
 */
export function flag(value, fallback) {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

/**
 * Which value-added services this deployment shows.
 *
 * The backend licenses each service separately (HOTELS, FLIGHTS, WALLETS,
 * PROMOTIONAL-COUPONS, ...) and tells the customer app nothing about it: an
 * unlicensed feature's routes simply answer 404. Visibility here is decided
 * by env only, one flag per product, all off unless the deployment says
 * otherwise (decision on SD-1036). A flag that is on for a service the
 * deployment does not hold shows entry points that lead to 404s, so set them
 * from the licence, not from hope.
 *
 * VITE_TRAVEL_ENABLED (default on) is gone; a brand that had it set must move
 * to VITE_HOTELS_ENABLED.
 */

/** Hotels: the search, hotel page, price hold and bookings. */
export function hotelsEnabled() {
    return flag(import.meta.env.VITE_HOTELS_ENABLED, false);
}

/** Flights: reserved for the flights UI; nothing renders yet. */
export function flightsEnabled() {
    return flag(import.meta.env.VITE_FLIGHTS_ENABLED, false);
}

/**
 * The customer wallet. A hard off-switch in front of the documented probe:
 * with this on, the wallet appears only when GET /wallet/subscription says
 * the deployment offers it; with it off, nothing is asked or shown.
 */
export function walletEnabled() {
    return flag(import.meta.env.VITE_WALLET_ENABLED, true);
}

/** Promotion coupons on the quote and receipt (SD-1037). */
export function couponsEnabled() {
    return flag(import.meta.env.VITE_COUPONS_ENABLED, false);
}

/** The maintenance-window banner fed by GET /client/v1/service-status. */
export function serviceStatusEnabled() {
    return flag(import.meta.env.VITE_SERVICE_STATUS_ENABLED, false);
}

/**
 * Which Volume (open banking) environment to talk to.
 *
 * The transfer flow used to hardcode SANDBOX. A production build that ships
 * that takes no real money and the transfer sits waiting, so this is the one
 * flag with no production fallback: a production build with the variable unset
 * gets null, and the payment components render an unavailable state instead of
 * guessing. Development builds fall back to SANDBOX so a local checkout works.
 *
 * @param {boolean} isProductionBuild defaults to Vite's PROD
 * @returns {'PRODUCTION'|'SANDBOX'|null}
 */
export function volumePaymentEnvironment(isProductionBuild = import.meta.env.PROD) {
    const raw = String(import.meta.env.VITE_VOLUME_PAYMENT_ENVIRONMENT ?? '').trim().toUpperCase();

    if (raw === 'PRODUCTION' || raw === 'SANDBOX') {
        return raw;
    }

    return isProductionBuild ? null : 'SANDBOX';
}
