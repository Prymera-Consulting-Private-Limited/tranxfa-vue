import HotelSelectionRate from "@/models/travel/hotels/hotel_selection_rate.js";
import CatalogHotel from "@/models/travel/hotels/catalog_hotel.js";

/**
 * The priced, ready-to-book quote a prebook resolves into. rate is the same
 * shape a hotel-view rate already is; hotel is lifted out of the response's
 * rate.hotel_selection wrapper, since that wrapper carries nothing else this
 * page needs beyond the hotel it names.
 */
class HotelQuote {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {{amount: string|null, currency: string|null}}
     */
    price = {amount: null, currency: null};

    /**
     * @type {boolean}
     */
    priceChanged = false;

    /**
     * @type {{freeCancellation: boolean, freeCancellationBefore: string|null}}
     */
    cancellation = {freeCancellation: false, freeCancellationBefore: null};

    /**
     * @type {string|null}
     */
    expiresAt = null;

    /**
     * @type {HotelSelectionRate|null}
     */
    rate = null;

    /**
     * @type {CatalogHotel|null}
     */
    hotel = null;

    /**
     * Room occupancy from the search this quote was priced under — lifted out
     * of the same rate.hotel_selection wrapper hotel is, since the guest
     * details form needs it to know how many guest rows to seed per room.
     *
     * @type {Array<{adults: number, children: number[]}>}
     */
    guests = [];

    static getInstance(data) {
        const quote = new HotelQuote();

        quote.id = data.id;
        quote.price = {
            amount: data.price?.amount ?? null,
            currency: data.price?.currency ?? null,
        };
        quote.priceChanged = data.price_changed ?? false;
        quote.cancellation = {
            freeCancellation: data.cancellation?.free_cancellation ?? false,
            freeCancellationBefore: data.cancellation?.free_cancellation_before ?? null,
        };
        quote.expiresAt = data.expires_at;

        if (data.rate) {
            quote.rate = HotelSelectionRate.getInstance(data.rate);
        }

        if (data.rate?.hotel_selection?.hotel) {
            quote.hotel = CatalogHotel.getInstance(data.rate.hotel_selection.hotel);
        }

        quote.guests = data.rate?.hotel_selection?.search?.guests ?? [];

        return quote;
    }
}

export default HotelQuote;
