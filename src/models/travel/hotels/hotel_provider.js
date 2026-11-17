import HotelPhoto from "@/models/travel/hotels/hotel_photo.js";
import HotelFacility from "@/models/travel/hotels/hotel_facility.js";

/**
 * What the supplier itself knows about a hotel, as opposed to our catalog entry.
 */
class HotelProvider {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {number|null}
     */
    hotelId = null;

    /**
     * @type {string|null}
     */
    hotelKey = null;

    /**
     * @type {string|null}
     */
    name = null;

    /**
     * @type {string|null}
     */
    slug = null;

    /**
     * Segments are separated with semicolons on this endpoint, not commas.
     *
     * @type {string|null}
     */
    address = null;

    /**
     * @type {string|null}
     */
    phone = null;

    /**
     * @type {string|null}
     */
    email = null;

    /**
     * Local time at the hotel, as "HH:mm:ss".
     *
     * @type {string|null}
     */
    checkInTime = null;

    /**
     * @type {string|null}
     */
    checkOutTime = null;

    /**
     * @type {HotelPhoto[]}
     */
    photos = [];

    /**
     * @type {HotelFacility[]}
     */
    facilities = [];

    /**
     * Not modelled yet — the endpoint returns an empty list until the rooms and
     * their rates are added to it.
     *
     * @type {Array}
     */
    roomTypes = [];

    static getInstance(data) {
        const provider = new HotelProvider();

        provider.id = data.id;
        provider.hotelId = data.provider_hotel_id;
        provider.hotelKey = data.provider_hotel_key;
        provider.name = data.provider_hotel_name;
        provider.slug = data.provider_hotel_slug;
        provider.address = data.provider_address;
        provider.phone = data.provider_phone;
        provider.email = data.provider_email;
        provider.checkInTime = data.provider_check_in_time;
        provider.checkOutTime = data.provider_check_out_time;

        if (Array.isArray(data.photos)) {
            provider.photos = HotelPhoto.getCollection(data.photos);
        }

        if (Array.isArray(data.facilities)) {
            provider.facilities = HotelFacility.getCollection(data.facilities);
        }

        if (Array.isArray(data.room_types)) {
            provider.roomTypes = data.room_types;
        }

        return provider;
    }
}

export default HotelProvider;
