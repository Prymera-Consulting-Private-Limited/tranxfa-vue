import HotelRate from "@/models/travel/hotels/hotel_rate.js";

/**
 * One hotel as a region search returns it. The backend resolves the supplier's
 * rate list down to the cheapest rate before it gets here, so a search hotel
 * carries exactly one price and a count of what else it has.
 */
class Hotel {
    /**
     * The canonical hotel id, which is what a hotel link routes on.
     *
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
     * Normalised server-side, so it is rendered as it arrives.
     *
     * @type {string|null}
     */
    address = null;

    /**
     * @type {string|null}
     */
    region = null;

    /**
     * Null when the hotel is unrated, which is not the same as nought stars.
     *
     * @type {number|null}
     */
    starRating = null;

    /**
     * Ready to request at each size, null when the hotel has no photo at all.
     *
     * @type {{thumbnail: string, card: string, large: string}|null}
     */
    photo = null;

    /**
     * Codes, whose display text comes from the response's labels dictionary.
     *
     * @type {string[]}
     */
    amenities = [];

    /**
     * How many rates the hotel has in total, only one of which is priced here.
     *
     * @type {number}
     */
    rateCount = 0;

    /**
     * @type {HotelRate|null}
     */
    cheapestRate = null;

    static getInstance(data) {
        const hotel = new Hotel();

        hotel.id = data.id;
        hotel.slug = data.slug;
        hotel.name = data.name;
        hotel.address = data.address;
        hotel.region = data.region;
        hotel.starRating = data.star_rating ?? null;
        hotel.photo = data.photo ?? null;
        hotel.amenities = data.amenities ?? [];
        hotel.rateCount = data.rate_count ?? 0;

        if (data.cheapest_rate) {
            hotel.cheapestRate = HotelRate.getInstance(data.cheapest_rate);
        }

        return hotel;
    }

    /**
     * @param {Array} data
     * @returns {Hotel[]}
     */
    static getCollection(data) {
        return data.map(item => Hotel.getInstance(item));
    }
}

export default Hotel;
