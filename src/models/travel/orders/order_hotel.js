/**
 * The hotel as a booking records it. The id and slug are the canonical ones
 * search returns, so a booking can link back into the hotel page.
 */
class OrderHotel {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {string|null}
     */
    slug = null;

    /**
     * @type {string|null}
     */
    name = null;

    /**
     * One display string rather than components.
     *
     * @type {string|null}
     */
    address = null;

    /**
     * @type {number|null}
     */
    starRating = null;

    static getInstance(data) {
        const hotel = new OrderHotel();

        hotel.id = data.id;
        hotel.slug = data.slug;
        hotel.name = data.name;
        hotel.address = data.address ?? null;
        hotel.starRating = data.star_rating ?? null;

        return hotel;
    }
}

export default OrderHotel;
