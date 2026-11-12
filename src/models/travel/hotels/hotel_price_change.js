import Money from "@/models/travel/money.js";
import TravelQuote from "@/models/travel/quote.js";

/**
 * The hotel's answer when it asks another price at the moment of booking
 * (SD-1839). Nothing has been booked or charged. The new price is already held
 * as a quote of its own, and taking it is booking that quote with the same
 * guests, so nothing the customer typed has to be asked for again.
 */
class HotelPriceChange {
    /**
     * Written to be shown.
     *
     * @type {string|null}
     */
    message = null;

    /**
     * The total of the price the customer agreed to.
     *
     * @type {Money|null}
     */
    was = null;

    /**
     * The new price, in Read Quote's shape. It can carry other terms than the
     * old one: when the original rate has gone, the hotel may restate the same
     * room on different cancellation terms.
     *
     * @type {TravelQuote|null}
     */
    quote = null;

    static getInstance(data) {
        const change = new HotelPriceChange();

        change.message = data.message ?? null;
        change.was = Money.getInstance(data.was ?? {}, 'total');
        change.quote = TravelQuote.getInstance(data.quote);

        return change;
    }
}

export default HotelPriceChange;
