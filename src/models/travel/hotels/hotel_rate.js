import MealData from "@/models/travel/hotels/meal_data.js";
import PaymentOptions from "@/models/travel/hotels/payment_options.js";
import RoomExtension from "@/models/travel/hotels/room_extension.js";
import NoShow from "@/models/travel/hotels/no_show.js";
import RoomDataTranslation from "@/models/travel/hotels/room_data_translation.js";

class HotelRate {
    /**
     * @type {string|null}
     */
    matchHash = null;

    /**
     * @type {string|null}
     */
    searchHash = null;

    /**
     * @type {string[]}
     */
    dailyPrices = [];

    /**
     * @type {string|null}
     */
    meal = null;

    /**
     * @type {MealData|null}
     */
    mealData = null;

    /**
     * @type {PaymentOptions|null}
     */
    paymentOptions = null;

    /**
     * @type {object|null}
     */
    barRatePriceData = null;

    /**
     * @type {RoomExtension|null}
     */
    roomExtension = null;

    /**
     * @type {string|null}
     */
    roomName = null;

    /**
     * @type {object|null}
     */
    roomNameInfo = null;

    /**
     * @type {string[]}
     */
    serpFilters = [];

    /**
     * @type {object|null}
     */
    sellPriceLimits = null;

    /**
     * @type {number|null}
     */
    allotment = null;

    /**
     * @type {string[]}
     */
    amenitiesData = [];

    /**
     * @type {boolean|null}
     */
    anyResidency = null;

    /**
     * @type {object|null}
     */
    deposit = null;

    /**
     * @type {NoShow|null}
     */
    noShow = null;

    /**
     * @type {RoomDataTranslation|null}
     */
    roomDataTranslation = null;

    /**
     * @type {object|null}
     */
    legalInfo = null;

    /**
     * @type {boolean|null}
     */
    isPackage = null;

    static getInstance(data) {
        const rate = new HotelRate();

        rate.matchHash = data.match_hash;
        rate.searchHash = data.search_hash;
        rate.dailyPrices = data.daily_prices ?? [];
        rate.meal = data.meal;

        if (data.meal_data) {
            rate.mealData = MealData.getInstance(data.meal_data);
        }

        if (data.payment_options) {
            rate.paymentOptions = PaymentOptions.getInstance(data.payment_options);
        }

        rate.barRatePriceData = data.bar_rate_price_data;

        if (data.rg_ext) {
            rate.roomExtension = RoomExtension.getInstance(data.rg_ext);
        }

        rate.roomName = data.room_name;
        rate.roomNameInfo = data.room_name_info;
        rate.serpFilters = data.serp_filters ?? [];
        rate.sellPriceLimits = data.sell_price_limits;
        rate.allotment = data.allotment;
        rate.amenitiesData = data.amenities_data ?? [];
        rate.anyResidency = data.any_residency;
        rate.deposit = data.deposit;

        if (data.no_show) {
            rate.noShow = NoShow.getInstance(data.no_show);
        }

        if (data.room_data_trans) {
            rate.roomDataTranslation = RoomDataTranslation.getInstance(data.room_data_trans);
        }

        rate.legalInfo = data.legal_info;
        rate.isPackage = data.is_package;

        return rate;
    }
}

export default HotelRate;