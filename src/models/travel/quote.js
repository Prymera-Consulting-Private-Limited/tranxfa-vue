import Money from "@/models/travel/money.js";
import {getLabels} from "@/composables/api_utils.js";
import OrderHotel from "@/models/travel/orders/order_hotel.js";
import RateCancellation from "@/models/travel/hotels/rate_cancellation.js";

/**
 * A price held for fifteen minutes, and what a booking is created from.
 *
 * Nothing about it is recalculated once written — the pricing rule, the exchange
 * rate behind it and the terms are all recorded, so superseding any of them
 * tomorrow leaves this quote exactly as the customer saw it. The one exception is
 * cancellation, which is evaluated fresh on every read because that answer
 * genuinely moves with the clock.
 */
class TravelQuote {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {string|null}
     */
    reference = null;

    /**
     * Deliberately shorter than the supplier's own price hold. Past it the quote
     * answers 410 with a message written to be shown.
     *
     * @type {string|null}
     */
    expiresAt = null;

    /**
     * @type {string|null}
     */
    currency = null;

    /**
     * @type {number}
     */
    currencyDecimalPlaces = 2;

    /**
     * @type {number|null}
     */
    nights = null;

    /**
     * @type {string|null}
     */
    checkIn = null;

    /**
     * @type {string|null}
     */
    checkOut = null;

    /**
     * @type {string|null}
     */
    residency = null;

    /**
     * @type {{rooms: Array<{adults: number, children_ages: number[]}>}|null}
     */
    occupancy = null;

    /**
     * The same shape a booking records, so one model serves both.
     *
     * @type {OrderHotel|null}
     */
    hotel = null;

    /**
     * @type {{roomName: string|null, meal: string|null}|null}
     */
    room = null;

    /**
     * Guaranteed to sum to the total — the total is the sum of these rather than
     * a separately converted figure.
     *
     * @type {Array<{key: string, label: string, amount: Money}>}
     */
    breakdown = [];

    /**
     * @type {Money|null}
     */
    total = null;

    /**
     * @type {Money|null}
     */
    perNight = null;

    /**
     * @type {Money|null}
     */
    payableAtProperty = null;

    /**
     * @type {RateCancellation|null}
     */
    cancellation = null;

    /**
     * @type {object}
     */
    labels = {};

    /**
     * @returns {{currency: string, decimalPlaces: number}}
     */
    get money() {
        return {currency: this.currency ?? '', decimalPlaces: this.currencyDecimalPlaces};
    }

    /**
     * The room-by-room shape the guest breakdown reads.
     *
     * @returns {Array<{adults: number, children: number[]}>}
     */
    get rooms() {
        return (this.occupancy?.rooms ?? []).map(room => ({
            adults: room.adults ?? 0,
            children: room.children_ages ?? [],
        }));
    }

    static getInstance(data) {
        const quote = new TravelQuote();

        quote.id = data.id;
        quote.reference = data.reference ?? null;
        quote.expiresAt = data.expires_at ?? null;
        quote.currency = data.currency ?? null;
        quote.currencyDecimalPlaces = data.currency_decimal_places ?? 2;
        quote.nights = data.nights ?? null;
        quote.checkIn = data.check_in ?? null;
        quote.checkOut = data.check_out ?? null;
        quote.residency = data.residency ?? null;
        quote.occupancy = data.occupancy ?? null;

        if (data.hotel) {
            quote.hotel = OrderHotel.getInstance(data.hotel);
        }

        if (data.room) {
            quote.room = {
                roomName: data.room.room_name ?? null,
                meal: data.room.meal ?? null,
            };
        }

        quote.breakdown = (data.breakdown ?? []).map(line => ({
            key: line.key,
            label: line.label,
            amount: Money.getInstance(line, 'amount'),
        }));

        quote.total = Money.getInstance(data, 'total');
        quote.perNight = Money.getInstance(data, 'per_night');
        quote.payableAtProperty = Money.getInstance(data, 'payable_at_property');

        if (data.cancellation) {
            quote.cancellation = RateCancellation.getInstance(data.cancellation);
        }

        quote.labels = getLabels(data.labels);

        return quote;
    }
}

export default TravelQuote;
