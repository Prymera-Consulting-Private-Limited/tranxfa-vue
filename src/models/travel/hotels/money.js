/**
 * One amount, three ways: the integer to compute with, and two rendered forms
 * the api produced.
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
     * @type {string|null}
     */
    formatted = null;

    /**
     * @type {string|null}
     */
    currencyPrefixed = null;

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
     * The three forms travel as sibling keys — total, total_formatted,
     * total_currency_prefixed — so the field name is the prefix.
     *
     * @param {object} data
     * @param {string} key
     * @returns {Money}
     */
    static getInstance(data, key) {
        const money = new Money();

        money.amount = data[key] === null || data[key] === undefined ? null : Number(data[key]);
        money.formatted = data[`${key}_formatted`] ?? null;
        money.currencyPrefixed = data[`${key}_currency_prefixed`] ?? null;

        return money;
    }
}

export default Money;
