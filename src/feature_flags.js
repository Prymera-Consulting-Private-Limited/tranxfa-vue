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
 * Whether this deployment sells travel.
 *
 * Travel is licensed per deployment and nothing on the customer says whether
 * this one has the licence - every travel route simply answers 404 without it.
 * The flag is the stand-in until app and domain scoping lands and supplies a
 * real field.
 *
 * Defaults to on, which is what feature/travel_hotels shipped. A deployment
 * without the licence must set VITE_TRAVEL_ENABLED=false, or its customers see
 * Hotels and Bookings tabs leading to 404s.
 *
 * @returns {boolean}
 */
export function travelEnabled() {
    return flag(import.meta.env.VITE_TRAVEL_ENABLED, true);
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
