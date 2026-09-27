import Money from "@/models/travel/money.js";
import {reportUnexpectedError} from "@/composables/api_utils.js";

/**
 * One charge the hotel collects on arrival, on top of what we take.
 *
 * Each is in the property's own currency and is never converted: the guest pays
 * it at the desk in whatever the property asks for, and converting it was the
 * fault the supplier asked us to remove. Two charges on one rate can be in two
 * currencies, so a list of these is never summed.
 */
class PropertyCharge {
    /**
     * The supplier's own label — city_tax, resort_fee, vat. Free text, so it is
     * shown and never branched on.
     *
     * @type {string|null}
     */
    name = null;

    /**
     * @type {string|null}
     */
    currency = null;

    /**
     * Minor units of this charge's own currency, which may take no decimal places
     * at all. `amount.decimal` is the form to compute with.
     *
     * @type {Money|null}
     */
    amount = null;

    static getInstance(data) {
        const charge = new PropertyCharge();

        charge.name = data.name ?? null;
        charge.currency = data.currency ?? null;
        charge.amount = Money.getInstance(data, 'amount');

        return charge;
    }

    /**
     * An absent value means nothing is owed on arrival. Anything else that is not
     * a list is the single converted amount the api used to send, which no longer
     * describes what the guest will pay — so it is reported rather than rendered,
     * and the customer sees no figure instead of a wrong or an undefined one.
     *
     * @param {*} data
     * @returns {PropertyCharge[]}
     */
    static getCollection(data) {
        if (data === null || data === undefined) {
            return [];
        }

        if (!Array.isArray(data)) {
            reportUnexpectedError(new TypeError(`payable_at_property is not a list: ${JSON.stringify(data)}`), 'Payable at property');

            return [];
        }

        return data.map(item => PropertyCharge.getInstance(item));
    }
}

export default PropertyCharge;
