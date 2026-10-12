import RoomExtension from "@/models/travel/hotels/room_extension.js";
import RoomDataTranslation from "@/models/travel/hotels/room_data_translation.js";

/**
 * A rate as the hotel-view endpoint prices it against a search_id, distinct
 * from the raw supplier rate the region search returns — no book hash or
 * payment options, priced as a single total rather than per payment type.
 */
class HotelSelectionRate {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {{amount: string|null, currency: string|null}}
     */
    price = {amount: null, currency: null};

    /**
     * @type {string|null}
     */
    mealType = null;

    /**
     * @type {{freeCancellation: boolean, freeCancellationBefore: string|null}}
     */
    cancellation = {freeCancellation: false, freeCancellationBefore: null};

    /**
     * @type {string|null}
     */
    roomName = null;

    /**
     * @type {string|null}
     */
    originalRateName = null;

    /**
     * @type {number|null}
     */
    allotment = null;

    /**
     * @type {string[]}
     */
    amenities = [];

    /**
     * room_data on this endpoint carries the same fields as room_data_trans
     * elsewhere in the api, just under a shorter key.
     *
     * @type {RoomDataTranslation|null}
     */
    roomData = null;

    /**
     * rg_ext here matches the shape used for a room type's own static data.
     *
     * @type {RoomExtension|null}
     */
    rgExt = null;

    static getInstance(data) {
        const rate = new HotelSelectionRate();

        rate.id = data.id;
        rate.price = {
            amount: data.price?.amount ?? null,
            currency: data.price?.currency ?? null,
        };
        rate.mealType = data.meal_type;
        rate.cancellation = {
            freeCancellation: data.cancellation?.free_cancellation ?? false,
            freeCancellationBefore: data.cancellation?.free_cancellation_before ?? null,
        };
        rate.roomName = data.room_name;
        rate.originalRateName = data.original_rate_name;
        rate.allotment = data.allotment;
        rate.amenities = data.amenities ?? [];

        if (data.room_data) {
            rate.roomData = RoomDataTranslation.getInstance(data.room_data);
        }

        if (data.rg_ext) {
            rate.rgExt = RoomExtension.getInstance(data.rg_ext);
        }

        return rate;
    }

    /**
     * @param {Array} data
     * @returns {HotelSelectionRate[]}
     */
    static getCollection(data) {
        return data.map(item => HotelSelectionRate.getInstance(item));
    }
}

export default HotelSelectionRate;
