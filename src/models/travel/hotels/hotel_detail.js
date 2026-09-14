import HouseRuleCharge from "@/models/travel/hotels/house_rule_charge.js";

/**
 * A hotel as its own page describes it — the authoritative answer, and the only
 * place the supplier will issue a token against a rate.
 */
class HotelDetail {
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
    checkInFrom = null;

    /**
     * @type {string|null}
     */
    checkOutUntil = null;

    /**
     * Ordered server-side and ready to request at each size. Never sorted here —
     * the order is the hotel's own idea of which photo leads.
     *
     * @type {Array<{thumbnail: string, card: string, large: string, xlarge: string}>}
     */
    photos = [];

    /**
     * Codes, whose display text comes from the response's labels dictionary.
     *
     * @type {string[]}
     */
    amenities = [];

    /**
     * Prose the customer reads, kept apart from money they may be asked for.
     *
     * @type {Array<{title: string, body: string}>}
     */
    houseRules = [];

    /**
     * @type {HouseRuleCharge[]}
     */
    charges = [];

    /**
     * @returns {string|null}
     */
    get mapUrl() {
        if (this.latitude === null || this.longitude === null) {
            return null;
        }

        return `https://www.google.com/maps/search/?api=1&query=${this.latitude},${this.longitude}`;
    }

    static getInstance(data) {
        const hotel = new HotelDetail();

        hotel.id = data.id;
        hotel.slug = data.slug;
        hotel.name = data.name;
        hotel.address = data.address ?? null;
        hotel.region = data.region ?? null;
        hotel.starRating = data.star_rating ?? null;
        hotel.latitude = data.latitude ?? null;
        hotel.longitude = data.longitude ?? null;
        hotel.checkInFrom = data.check_in_from ?? null;
        hotel.checkOutUntil = data.check_out_until ?? null;
        hotel.photos = data.photos ?? [];
        hotel.amenities = data.amenities ?? [];

        if (data.house_rules) {
            hotel.houseRules = (data.house_rules.text ?? []).map(rule => ({
                title: rule.title ?? null,
                body: rule.body ?? null,
            }));

            hotel.charges = HouseRuleCharge.getCollection(data.house_rules.charges ?? []);
        }

        return hotel;
    }
}

export default HotelDetail;
