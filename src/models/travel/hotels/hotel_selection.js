import HotelSelectionRate from "@/models/travel/hotels/hotel_selection_rate.js";
import HotelSearch from "@/models/travel/hotels/hotel_search.js";

/**
 * The priced, time-limited view of a hotel a search_id resolves into. Its id
 * is the opaque hotel_selection_id a booking step would be handed next.
 */
class HotelSelection {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {string|null}
     */
    expiresAt = null;

    /**
     * @type {boolean}
     */
    isExpired = false;

    /**
     * @type {HotelSelectionRate[]}
     */
    rates = [];

    /**
     * The stay this selection was priced for, resolved server-side from the
     * search_id rather than trusted from the url.
     *
     * @type {HotelSearch|null}
     */
    search = null;

    static getInstance(data) {
        const selection = new HotelSelection();

        selection.id = data.id;
        selection.expiresAt = data.expires_at;
        selection.isExpired = data.is_expired ?? false;

        if (Array.isArray(data.rates)) {
            selection.rates = HotelSelectionRate.getCollection(data.rates);
        }

        if (data.search) {
            selection.search = HotelSearch.getInstance(data.search);
        }

        return selection;
    }
}

export default HotelSelection;
