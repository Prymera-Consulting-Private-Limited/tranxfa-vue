import HotelRate from "@/models/travel/hotels/hotel_rate.js";

class Hotel {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {string|null}
     */
    hotelId = null;

    /**
     * @type {string|null}
     */
    name = null;

    /**
     * @type {string|null}
     */
    slug = null;

    /**
     * @type {string|null}
     */
    region = null;

    /**
     * @type {number|null}
     */
    hid = null;

    /**
     * @type {number|null}
     */
    starRating = null;

    /**
     * @type {number|null}
     */
    latitude = null;

    /**
     * @type {number|null}
     */
    longitude = null;

    /**
     * @type {string|null}
     */
    address = null;

    /**
     * Photo urls still carry the supplier's {size} placeholder.
     *
     * @type {string[]}
     */
    photos = [];

    /**
     * @type {HotelRate[]}
     */
    rates = [];

    /**
     * @type {object|null}
     */
    barPriceData = null;

    static getInstance(data) {
        const hotel = new Hotel();

        hotel.id = data.id;
        hotel.hid = data.hid;

        if (Array.isArray(data.rates)) {
            hotel.rates = data.rates.map(rate => HotelRate.getInstance(rate));
        }

        if (data.catalog_hotel) {
            hotel.hotelId = data.catalog_hotel.id;
            hotel.name = data.catalog_hotel.name;
            hotel.slug = data.catalog_hotel.slug;
            hotel.starRating = data.catalog_hotel.star_rating;
            hotel.latitude = data.catalog_hotel.latitude;
            hotel.longitude = data.catalog_hotel.longitude;

            if (data.catalog_hotel.primary_region) {
                hotel.region = data.catalog_hotel.primary_region.name;
            }

            if (data.catalog_hotel.provider) {
                hotel.address = Hotel.getAddress(data.catalog_hotel.provider.provider_address, hotel.region);

                if (Array.isArray(data.catalog_hotel.provider.photos)) {
                    hotel.photos = data.catalog_hotel.provider.photos
                        .map(photo => photo.url)
                        .filter(Boolean);
                }
            }
        }

        hotel.barPriceData = data.bar_price_data;

        return hotel;
    }

    /**
     * Supplier addresses usually repeat the city as the last segment, e.g.
     * "48 Rue du Commerce, Paris" for a hotel already labelled as Paris.
     *
     * @param {string|null} address
     * @param {string|null} region
     * @returns {string|null}
     */
    static getAddress(address, region) {
        if (!address) {
            return null;
        }

        const segments = address.split(',').map(segment => segment.trim()).filter(Boolean);

        if (region && segments.length > 1 && segments.at(-1).toLowerCase() === region.toLowerCase()) {
            segments.pop();
        }

        return segments.join(', ');
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