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
     * Which row this is, and the one thing that identifies it (SD-1220). From
     * console 2026.10.6 the token below carries the same value, but it is withheld
     * from any rate that cannot be booked. Sent on the hotel page only, so a
     * search result's cheapest rate has none.
     *
     * @type {string|null}
     */
    id = null;

    /**
     * What a quote is asked for, issued on the hotel page and nowhere else. Null
     * means this rate cannot be taken forward. From console 2026.10.6 it is our
     * id for the rate, the same value as id, and it does not rotate: the quote is
     * priced on the one rate it names. Before that it was the supplier's match
     * key, which near-identical rates shared (SD-1219).
     *
     * @type {string|null}
     */
    token = null;

    /**
     * @type {string|null}
     */
    roomName = null;

    /**
     * This rate's own room, in the same sizes as the hotel's photos. Empty when
     * the supplier's catalogue has no room matching the rate exactly, and the
     * console then sends none rather than a similar room's (SD-1838).
     *
     * @type {Array<{thumbnail: string, card: string, large: string, xlarge: string}>}
     */
    roomPhotos = [];

    /**
     * ROOM- codes, each worded in the page's labels. Open-ended, so they are
     * looked up there rather than matched here.
     *
     * @type {string[]}
     */
    roomAmenities = [];

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
     * Always false on search: a rate is only given a token on the hotel page,
     * so nothing found here can be booked from here.
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
        // A console before 2026.10.11 sends neither.
        rate.roomPhotos = data.room_photos ?? [];
        rate.roomAmenities = data.room_amenities ?? [];
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
