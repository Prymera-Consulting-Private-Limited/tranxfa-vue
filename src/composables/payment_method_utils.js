import PaymentMethodRefusalType from "@/enums/payment_method_refusal_type.js";

/**
 * Whether a saved quote's amount meets what the fee rule asks of one way to
 * pay, checked the way Confirm Quote checks it (SD-1774): the amount sent,
 * which is the quote's local_amount, must be at least min_amount and a whole
 * multiple of amount_multiplier. A method the amount does not meet is greyed
 * out rather than offered and then refused.
 *
 * All three arrive as decimal strings in the payment currency, so they are
 * compared as whole minor units, never as floats: a multiple of 5.00 is a
 * question about cents, and 0.1 + 0.2 is not 0.3.
 *
 * Nothing here works out what anybody pays. Every amount on screen is the one
 * the API rendered, and anything this cannot read is left for Confirm Quote to
 * judge (SD-1792).
 *
 * @param {PaymentMethod} method
 * @param {string|null} amountSent The quote's local_amount.
 * @returns {string|null} A PaymentMethodRefusalType, or null when it is met.
 */
export function getMethodRefusal(method, amountSent) {
    if (amountSent === null || amountSent === undefined) {
        return null;
    }

    const places = Math.max(...[amountSent, method.minAmount, method.amountMultiplier].map(getDecimalPlaces));
    const sent = toMinorUnits(amountSent, places);

    if (Number.isNaN(sent)) {
        return null;
    }

    if (method.minAmount !== null && sent < toMinorUnits(method.minAmount, places)) {
        return PaymentMethodRefusalType.BELOW_MINIMUM;
    }

    if (method.amountMultiplier !== null) {
        const step = toMinorUnits(method.amountMultiplier, places);

        if (step > 0 && sent % step !== 0) {
            return PaymentMethodRefusalType.NOT_A_MULTIPLE;
        }
    }

    return null;
}

/**
 * @param {string|null|undefined} value
 * @returns {number}
 */
function getDecimalPlaces(value) {
    if (value === null || value === undefined) {
        return 0;
    }

    const [, fraction = ''] = String(value).split('.');

    return fraction.length;
}

/**
 * "25.5" at two places is 2550. A value that is not a plain decimal string
 * comes out as NaN, which every comparison above answers false, so the method
 * stays offered and the server has the last word.
 *
 * @param {string} value
 * @param {number} places
 * @returns {number}
 */
function toMinorUnits(value, places) {
    const [whole, fraction = ''] = String(value).trim().split('.');

    return Number(whole) * 10 ** places + Number(fraction.padEnd(places, '0') || 0);
}
