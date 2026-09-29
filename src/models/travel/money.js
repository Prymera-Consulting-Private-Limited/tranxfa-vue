/**
 * One amount, four ways: the integer to compute with, the exact decimal to hand
 * to anybody who wants money rather than minor units, and two rendered forms the
 * api produced.
 *
 * Formatting is deliberately not ours. How many decimal places a currency takes
 * and where its separators go is one answer given server-side, and a client that
 * re-derives it is one zero-decimal currency away from showing a yen price a
 * hundred times too small.
 */
class Money {
    /**
     * Minor units. Compare, sort and sum with this and nothing else.
     *
     * @type {number|null}
     */
    amount = null;

    /**
     * The same amount as money rather than minor units, exact, and with no
     * thousands separators — "196.40", "1234567.89". The one form that can be
     * turned back into a number.
     *
     * @type {string|null}
     */
    decimal = null;

    /**
     * @type {string|null}
     */
    formatted = null;

    /**
     * @type {string|null}
     */
    currencyPrefixed = null;

    /**
     * The amount as a number a provider will accept. Null rather than a guess
     * when the api did not send `decimal`, because every other route to this
     * value is wrong: dividing needs the currency's decimal places, which are not
     * on every response, and `formatted` carries separators, so parseFloat of
     * "1,234,567.89" is 1. That failure would only appear above a thousand, which
     * is the worst distribution a money bug can have.
     *
     * Number() rejects a separated string as NaN rather than truncating it, so a
     * formatted value arriving here refuses instead of underbilling.
     *
     * @returns {number|null}
     */
    get major() {
        if (this.decimal === null || this.decimal === '') {
            return null;
        }

        const value = Number(this.decimal);

        return Number.isFinite(value) ? value : null;
    }

    /**
     * A null amount keeps all three keys, so "not stated" is one test rather
     * than three.
     *
     * @returns {boolean}
     */
    get isStated() {
        return this.amount !== null;
    }

    /**
     * The forms travel as sibling keys — total, total_decimal, total_formatted,
     * total_currency_prefixed — so the field name is the prefix.
     *
     * @param {object} data
     * @param {string} key
     * @returns {Money}
     */
    static getInstance(data, key) {
        const money = new Money();

        money.amount = data[key] === null || data[key] === undefined ? null : Number(data[key]);
        money.decimal = data[`${key}_decimal`] ?? null;
        money.formatted = data[`${key}_formatted`] ?? null;
        money.currencyPrefixed = data[`${key}_currency_prefixed`] ?? null;

        return money;
    }
}

export default Money;
