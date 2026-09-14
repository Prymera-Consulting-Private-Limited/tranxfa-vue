import Money from "@/models/travel/money.js";

/**
 * Something the hotel may ask for on top of the stay — parking, a pet, a cot.
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
     * @type {Money|null}
     */
    amount = null;

    static getInstance(data) {
        const charge = new HouseRuleCharge();

        charge.type = data.type ?? null;
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
