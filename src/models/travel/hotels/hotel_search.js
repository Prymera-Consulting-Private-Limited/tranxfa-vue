import Region from "@/models/travel/region.js";

/**
 * The stay as the backend resolved and priced it, returned by both search/region
 * and hotel/{search}/{hotel}/view. Its id is the opaque search_id everything past
 * the first request is forwarded with instead of raw criteria.
 */
class HotelSearch {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {string|null}
     */
    checkin = null;

    /**
     * @type {string|null}
     */
    checkout = null;

    /**
     * Per room, the same shape the search criteria and the guest picker use.
     *
     * @type {Array<{adults: number, children: number[]}>}
     */
    guests = [];

    /**
     * @type {string|null}
     */
    currency = null;

    /**
     * @type {string|null}
     */
    language = null;

    /**
     * @type {Region|null}
     */
    region = null;

    static getInstance(data) {
        const search = new HotelSearch();

        search.id = data.id;
        search.checkin = data.checkin;
        search.checkout = data.checkout;
        search.guests = data.guests ?? [];
        search.currency = data.currency;
        search.language = data.language;

        if (data.region) {
            search.region = Region.getInstance(data.region);
        }

        return search;
    }
}

export default HotelSearch;
