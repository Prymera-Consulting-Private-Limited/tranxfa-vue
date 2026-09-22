/**
 * The stay as the backend resolved and priced it. Its id is the opaque search_id
 * every later request is forwarded with instead of raw criteria — it pins which
 * supplier answered, which is why a rate token means nothing without it, and it
 * stops the stay drifting between the prices shown and the hotel opened.
 */
class HotelSearch {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * Thirty minutes out. Past it the hotel page answers 404 with a message
     * written to be shown, since an aged-out search is not a customer's mistake.
     *
     * @type {string|null}
     */
    expiresAt = null;

    /**
     * @type {string|null}
     */
    checkIn = null;

    /**
     * @type {string|null}
     */
    checkOut = null;

    /**
     * @type {number|null}
     */
    nights = null;

    /**
     * Only echoed by the hotel page, which sends the stay back so a page reached
     * by the back button cannot describe a different one from the prices on it.
     *
     * @type {string|null}
     */
    residency = null;

    /**
     * @type {{rooms: Array<{adults: number, children_ages: number[]}>}|null}
     */
    occupancy = null;

    /**
     * The room-by-room shape the guest picker and the search criteria both use.
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
        const search = new HotelSearch();

        search.id = data.id;
        search.expiresAt = data.expires_at ?? null;
        search.checkIn = data.check_in ?? null;
        search.checkOut = data.check_out ?? null;
        search.nights = data.nights ?? null;
        search.residency = data.residency ?? null;
        search.occupancy = data.occupancy ?? null;

        return search;
    }
}

export default HotelSearch;
