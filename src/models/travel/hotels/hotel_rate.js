import Money from "@/models/travel/money.js";
import PropertyCharge from "@/models/travel/property_charge.js";
import RateCancellation from "@/models/travel/hotels/rate_cancellation.js";

/**
 * The one rate a search returns per hotel — the cheapest the supplier had. Every
 * amount arrives already rendered as well as in minor units, so nothing here is
 * formatted in the client.
 */
class HotelRate {
    /**
     * Which row this is, and the one thing that identifies it: the token below is
     * shared between near-identical rates and withheld from any that cannot be
     * booked (SD-1220). Sent on the hotel page only, so a search result's cheapest
     * rate has none.
     *
     * @type {string|null}
     */
    id = null;

    /**
     * The supplier's permission to proceed with this rate, issued on the hotel
     * page and nowhere else. Null means this rate cannot be taken forward. It
     * rotates at the next step, so it is what a quote is asked for rather than
     * what a booking is made with.
     *
     * @type {string|null}
     */
    token = null;

    /**
     * @type {string|null}
     */
    roomName = null;

    /**
     * A code from the supplier's meal vocabulary, null when it states nothing.
     *
     * @type {string|null}
     */
    meal = null;

    /**
     * @type {number|null}
     */
    allotment = null;

    /**
     * Always false on search: the supplier only issues a booking token on the
     * hotel page, so nothing found here can be booked from here.
     *
     * @type {boolean}
     */
    bookable = false;

    /**
     * What the customer pays us, line by line, already labelled for display.
     * A line can legitimately be zero — search results do not itemise taxes.
     *
     * @type {Array<{key: string, label: string, amount: Money}>}
     */
    breakdown = [];

    /**
     * @type {Money|null}
     */
    total = null;

    /**
     * The total divided by the nights, computed server-side. Nobody is charged
     * this and the nights are not individually priced at it, so it belongs beside
     * the total as a comparison rather than in the breakdown.
     *
     * @type {Money|null}
     */
    perNight = null;

    /**
     * What the hotel collects on arrival, on top of the total, one entry per
     * charge in the property's own currency. Empty when nothing is owed.
     *
     * @type {PropertyCharge[]}
     */
    payableAtProperty = [];

    /**
     * @type {RateCancellation|null}
     */
    cancellation = null;

    static getInstance(data) {
        const rate = new HotelRate();

        rate.id = data.id ?? null;
        rate.token = data.token ?? null;
        rate.roomName = data.room_name;
        rate.meal = data.meal ?? null;
        rate.allotment = data.allotment ?? null;
        rate.bookable = data.bookable ?? false;

        if (Array.isArray(data.breakdown)) {
            rate.breakdown = data.breakdown.map(line => ({
                key: line.key,
                label: line.label,
                amount: Money.getInstance(line, 'amount'),
            }));
        }

        rate.total = Money.getInstance(data, 'total');
        rate.perNight = Money.getInstance(data, 'per_night');
        rate.payableAtProperty = PropertyCharge.getCollection(data.payable_at_property);

        if (data.cancellation) {
            rate.cancellation = RateCancellation.getInstance(data.cancellation);
        }

        rate.assertTotalMatchesBreakdown();

        return rate;
    }

    /**
     * The backend guarantees the two agree and asked to hear about it rather than
     * have us pick one, so a mismatch is surfaced where it can be seen instead of
     * being rendered as if nothing were wrong.
     */
    assertTotalMatchesBreakdown() {
        if (!import.meta.env.DEV || this.breakdown.length === 0) {
            return;
        }

        const sum = this.breakdown.reduce((total, line) => total + (line.amount.amount ?? 0), 0);

        if (sum !== this.total.amount) {
            console.warn(`Hotel rate total ${this.total.amount} does not match its breakdown, which sums to ${sum}.`, this);
        }
    }

    /**
     * @param {Array} data
     * @returns {HotelRate[]}
     */
    static getCollection(data) {
        return data.map(item => HotelRate.getInstance(item));
    }
}

export default HotelRate;
