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
 * Value-added product visibility no longer lives here.
 *
 * It came from one hand-set flag per product per installation, and those
 * drifted from the licence in both directions: a product switched on in the
 * licence stayed invisible until somebody edited a flag, and a product whose
 * term had ended stayed on the menu offering screens that answer 404.
 * GET /client/v1/service-status carries value_added_services, so the licence
 * decides. See src/licensed_products.js (SD-1074).
 *
 * VITE_HOTELS_ENABLED, VITE_FLIGHTS_ENABLED, VITE_WALLET_ENABLED and
 * VITE_COUPONS_ENABLED are gone. A deployment that still sets them is setting
 * nothing; the licence is the switch.
 */

/**
 * Whether the maintenance-window banner renders.
 *
 * This used to decide whether GET /client/v1/service-status was called at all.
 * The same call now carries the licence, so it always runs; this decides only
 * whether the banner is shown.
 */
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
