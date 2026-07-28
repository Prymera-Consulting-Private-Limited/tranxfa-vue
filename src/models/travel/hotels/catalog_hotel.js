import Region from "@/models/travel/region.js";
import Hotel from "@/models/travel/hotels/hotel.js";
import HotelProvider from "@/models/travel/hotels/hotel_provider.js";
import HotelSelection from "@/models/travel/hotels/hotel_selection.js";

/**
 * A single hotel as our catalog holds it. The search returns this nested inside a
 * priced result, whereas the hotel page asks for it on its own, so it is a model
 * in its own right rather than a shape of Hotel.
 */
class CatalogHotel {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {string|null}
     */
    name = null;

    /**
     * @type {string|null}
     */
    slug = null;

    /**
     * @type {number|null}
     */
    starRating = null;

    /**
     * Sent as strings by the api.
     *
     * @type {string|null}
     */
    latitude = null;

    /**
     * @type {string|null}
     */
    longitude = null;

    /**
     * The catalog's own cover image, which is not always one of the gallery photos.
     *
     * @type {string|null}
     */
    photo = null;

    /**
     * @type {Region|null}
     */
    region = null;

    /**
     * The priced, time-limited view this hotel was resolved into for a
     * search_id, one rate per room and board combination.
     *
     * @type {HotelSelection|null}
     */
    selection = null;

    /**
     * @type {HotelProvider|null}
     */
    provider = null;

    /**
     * Normalised once here, since the raw value repeats the city and mixes separators.
     *
     * @type {string|null}
     */
    address = null;

    /**
     * @returns {HotelSelectionRate[]}
     */
    get rates() {
        return this.selection?.rates ?? [];
    }

    /**
     * @returns {HotelPhoto[]}
     */
    get photos() {
        return this.provider?.photos ?? [];
    }

    /**
     * @returns {HotelFacility[]}
     */
    get facilities() {
        return this.provider?.facilities ?? [];
    }

    /**
     * @returns {Array}
     */
    get roomTypes() {
        return this.provider?.roomTypes ?? [];
    }

    /**
     * @returns {string|null}
     */
    get mapUrl() {
        if (!this.latitude || !this.longitude) {
            return null;
        }

        return `https://www.google.com/maps/search/?api=1&query=${this.latitude},${this.longitude}`;
    }

    static getInstance(data) {
        const hotel = new CatalogHotel();

        hotel.id = data.id;
        hotel.name = data.name;
        hotel.slug = data.slug;
        hotel.starRating = data.star_rating;
        hotel.latitude = data.latitude;
        hotel.longitude = data.longitude;
        hotel.photo = data.photo;

        if (data.primary_region) {
            hotel.region = Region.getInstance(data.primary_region);
        }

        if (data.selection) {
            hotel.selection = HotelSelection.getInstance(data.selection);
        }

        if (data.provider) {
            hotel.provider = HotelProvider.getInstance(data.provider);

            hotel.address = CatalogHotel.getAddress(hotel.provider.address, hotel.region?.name ?? null);
        }

        return hotel;
    }

    /**
     * Provider addresses on this endpoint separate segments with semicolons, e.g.
     * "220 Venice Way; Venice; CA 90291; USA, Los Angeles".
     *
     * @param {string|null} address
     * @param {string|null} region
     * @returns {string|null}
     */
    static getAddress(address, region) {
        if (!address) {
            return null;
        }

        return Hotel.getAddress(address.replace(/;/g, ','), region);
    }
}

export default CatalogHotel;
