import Money from "@/models/travel/money.js";

/**
 * One rule the hotel states about the stay — parking, a pet, a cot, breakfast,
 * a no-show. Since SD-1839 every rule arrives, not only those with a price:
 * one can be included, not available, or a condition with nothing to pay.
 *
 * Its currency is the property's own, not the customer's, because the hotel
 * collects this money and we neither convert it nor take a share. A booking
 * priced in GBP can carry a JPY parking charge, so the amount is only ever shown
 * with the currency it arrived in.
 */
class HouseRuleCharge {
    /**
     * What is being charged for, as a code with a label.
     *
     * @type {string|null}
     */
    type = null;

    /**
     * Which one of its kind this is, as a code with a label - MEAL-BREAKFAST
     * and MEAL-LUNCH are two meal charges. The supplier writes these as free
     * text, so new codes appear without notice: read the label, never match
     * the code. Null when nothing tells the charge apart from its type.
     *
     * @type {string|null}
     */
    detail = null;

    /**
     * Youngest age the charge covers, for a charge about children. Null when
     * the hotel states no ages.
     *
     * @type {number|null}
     */
    appliesFromAge = null;

    /**
     * Oldest age the charge covers.
     *
     * @type {number|null}
     */
    appliesToAge = null;

    /**
     * Whether it is included, paid for, not available, or simply not stated —
     * which are four different answers and must not collapse into two.
     *
     * @type {string|null}
     */
    inclusion = null;

    /**
     * What the amount is per, written to read after it: "per vehicle, per night".
     *
     * @type {string|null}
     */
    chargeUnit = null;

    /**
     * The property's currency, not the response's.
     *
     * @type {string|null}
     */
    currency = null;

    /**
     * Unstated, rather than nought, wherever there is no price to show: a rule
     * that is included, not available, a condition, or a charge the hotel gave
     * no figure for. Read `inclusion` for what such a rule says.
     *
     * @type {Money|null}
     */
    amount = null;

    static getInstance(data) {
        const charge = new HouseRuleCharge();

        charge.type = data.type ?? null;
        charge.detail = data.detail ?? null;
        charge.appliesFromAge = data.applies_from_age ?? null;
        charge.appliesToAge = data.applies_to_age ?? null;
        charge.inclusion = data.inclusion ?? null;
        charge.chargeUnit = data.charge_unit ?? null;
        charge.currency = data.currency ?? null;
        charge.amount = Money.getInstance(data, 'amount');

        return charge;
    }

    /**
     * @param {Array} data
     * @returns {HouseRuleCharge[]}
     */
    static getCollection(data) {
        return data.map(item => HouseRuleCharge.getInstance(item));
    }
}

export default HouseRuleCharge;
