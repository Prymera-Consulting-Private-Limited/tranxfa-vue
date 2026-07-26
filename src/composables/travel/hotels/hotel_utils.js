import axios from "axios";
import {computed, ref} from "vue";
import moment from "moment";
import {useCustomerStore} from "@/stores/customer.js";

const DATE_FORMAT = 'YYYY-MM-DD';

/**
 * The age a child starts on when added to a room, until the customer sets it.
 */
export const CHILD_AGE = 7;

/**
 * What the supplier accepts per search, and what the occupancy picker enforces.
 */
export const MAX_ROOMS = 9;
export const MIN_ADULTS = 1;
export const MAX_ADULTS = 6;
export const MAX_CHILDREN = 4;
export const MAX_ROOM_GUESTS = 10;
export const MAX_CHILD_AGE = 17;

/**
 * Only used until the customer's own country is loaded, since the supplier
 * prices on residency.
 */
const DEFAULT_RESIDENCY = 'IN';

const HOTELS_LIMIT = 250;

/**
 * The whole region comes back in one search, so the list is paged in the browser
 * and every filter still sees every hotel.
 */
export const HOTELS_PER_PAGE = 10;

const DEFAULT_ROOM = {adults: 2, children: []};

/**
 * The url is the source of truth for a search, so a shared link, a refresh and
 * the back button all reproduce the same results.
 *
 * @param {object} query
 * @returns {object} The request body for a region search.
 */
export function getCriteria(query = {}) {
    const checkin = getStayDate(query.checkin, 1);
    const checkout = getStayDate(query.checkout, 2);

    return {
        // A repeated ?region= arrives as an array, which is not an id.
        region_id: typeof query.region === 'string' && query.region.length ? query.region : null,
        checkin: checkin,
        checkout: moment(checkout).isAfter(checkin) ? checkout : moment(checkin).add(1, 'day').format(DATE_FORMAT),
        guests: getGuests(query.guests),
        hotels_limit: HOTELS_LIMIT,
    };
}

/**
 * @param {object} criteria
 * @returns {object}
 */
export function getQuery(criteria) {
    return {
        // Dropped by the router while no destination has been chosen.
        region: criteria.region_id ?? undefined,
        checkin: criteria.checkin,
        checkout: criteria.checkout,
        guests: getGuestsParam(criteria.guests),
    };
}

/**
 * Rooms are priced individually and on each child's age, so the url carries them
 * room by room: "2|1:5,9" is a double and a single sharing with a 5 and a 9 year
 * old. A room with no children is just its adult count.
 *
 * @param {Array} guests
 * @returns {string}
 */
function getGuestsParam(guests) {
    return guests.map(room => {
        if (!room.children?.length) {
            return String(room.adults);
        }

        return `${room.adults}:${room.children.join(',')}`;
    }).join('|');
}

/**
 * @param {string|undefined} value
 * @returns {Array<{adults: number, children: number[]}>}
 */
function getGuests(value) {
    if (typeof value !== 'string' || !value.length) {
        return [{...DEFAULT_ROOM}];
    }

    const guests = value.split('|').slice(0, MAX_ROOMS).map(getRoom);

    return guests.length ? guests : [{...DEFAULT_ROOM}];
}

/**
 * @param {string} value
 * @returns {{adults: number, children: number[]}}
 */
function getRoom(value) {
    const [adults, ages = ''] = value.split(':');

    const room = {
        adults: getCount(adults, DEFAULT_ROOM.adults, MIN_ADULTS, MAX_ADULTS),
        children: ages
            .split(',')
            .map(age => getCount(age, null, 0, MAX_CHILD_AGE))
            .filter(age => age !== null)
            .slice(0, MAX_CHILDREN),
    };

    // The counters cannot exceed this, so it only guards a hand-edited url.
    room.children = room.children.slice(0, Math.max(0, MAX_ROOM_GUESTS - room.adults));

    return room;
}

/**
 * A stay in the past cannot be priced, so it falls back to the default window.
 *
 * @param {string|undefined} value
 * @param {number} fallbackDays
 * @returns {string}
 */
function getStayDate(value, fallbackDays) {
    const date = moment(value, DATE_FORMAT, true);

    if (!date.isValid() || date.isBefore(moment().startOf('day'))) {
        return moment().add(fallbackDays, 'days').format(DATE_FORMAT);
    }

    return date.format(DATE_FORMAT);
}

/**
 * Anything out of range is clamped rather than dropped, since it still says what
 * the customer asked for.
 *
 * @param {string|undefined} value
 * @param {number|null} fallback
 * @param {number} min
 * @param {number} max
 * @returns {number|null}
 */
function getCount(value, fallback, min, max) {
    const count = Number.parseInt(value, 10);

    if (!Number.isInteger(count)) {
        return fallback;
    }

    return Math.min(Math.max(count, min), max);
}

/**
 * Photo urls arrive with a {size} placeholder that has to be swapped for one of
 * the supplier's supported dimensions before the image can be requested.
 *
 * @param {string|null} url
 * @param {string} size
 * @returns {string|null}
 */
export function getPhotoUrl(url, size = '640x400') {
    if (!url) {
        return null;
    }

    return url.replace('{size}', size);
}

/**
 * Most descriptive values arrive as slugs, e.g. "king-bed" or "half-board".
 *
 * @param {string|null} value
 * @returns {string}
 */
export function prettifyLabel(value) {
    if (!value) {
        return '';
    }

    const label = String(value).replace(/[-_]+/g, ' ').trim();

    return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * The cheapest rate we can actually price. Rates without payment options cannot
 * be displayed, so they are skipped.
 *
 * @param {Hotel} hotel
 * @returns {HotelRate|null}
 */
export function getCheapestRate(hotel) {
    const bookable = hotel.rates.filter(rate => rate.paymentOptions?.paymentTypes?.length > 0);

    if (bookable.length === 0) {
        return null;
    }

    return bookable.reduce((cheapest, rate) => {
        return getRateAmount(rate) < getRateAmount(cheapest) ? rate : cheapest;
    });
}

/**
 * @param {HotelRate} rate
 * @returns {number}
 */
export function getRateAmount(rate) {
    const payment = rate.paymentOptions.paymentTypes[0];

    return Number(payment.showAmount ?? payment.amount ?? 0);
}

/**
 * @param {HotelRate} rate
 * @returns {string}
 */
export function getRateCurrency(rate) {
    const payment = rate.paymentOptions.paymentTypes[0];

    return payment.showCurrencyCode ?? payment.currencyCode ?? '';
}

/**
 * A search is filtered in the browser, since one region search already returns
 * every hotel we are allowed to show.
 *
 * @returns {{maxPrice: number|null, stars: number[], photos: string|null, features: string[], amenities: string[]}}
 */
export function getFilters() {
    return {
        maxPrice: null,
        stars: [],
        // Either "with", "without", or no preference at all.
        photos: null,
        features: [],
        amenities: [],
    };
}

/**
 * Counts are taken over the whole result set rather than the filtered one, so an
 * option never reads as empty just because another group is narrowing it.
 *
 * @param {Array<{hotel: Hotel, rate: HotelRate}>} results
 * @returns {object}
 */
export function getFacets(results) {
    const prices = results.map(result => getRateAmount(result.rate));
    const stars = new Map();
    const features = new Map();
    const amenities = new Map();
    const photos = {with: 0, without: 0};

    results.forEach(({hotel, rate}) => {
        const rating = Math.round(hotel.starRating ?? 0);

        // A 0-star hotel is an apartment or a guest house, not a rating.
        if (rating > 0) {
            countValue(stars, rating);
        }

        photos[hotel.photos.length ? 'with' : 'without'] += 1;

        rate.serpFilters.forEach(value => countValue(features, value));
        rate.amenitiesData.forEach(value => countValue(amenities, value));
    });

    return {
        photos: photos,
        price: {
            // The supplier prices a search in one currency, so the first rate speaks for all.
            currency: results.length ? getRateCurrency(results[0].rate) : '',
            min: prices.length ? Math.floor(Math.min(...prices)) : 0,
            max: prices.length ? Math.ceil(Math.max(...prices)) : 0,
        },
        stars: [...stars.entries()]
            .map(([value, count]) => ({value: value, count: count}))
            .sort((a, b) => b.value - a.value),
        features: getOptions(features),
        amenities: getOptions(amenities),
    };
}

/**
 * Filters run against the rate the card shows, which is the cheapest bookable
 * one, so the price and the badges on screen always match what was filtered.
 *
 * @param {Array<{hotel: Hotel, rate: HotelRate}>} results
 * @param {object} filters
 * @returns {Array<{hotel: Hotel, rate: HotelRate}>}
 */
export function getFilteredResults(results, filters) {
    return results.filter(({hotel, rate}) => {
        if (filters.maxPrice !== null && getRateAmount(rate) > filters.maxPrice) {
            return false;
        }

        if (filters.stars.length && !filters.stars.includes(Math.round(hotel.starRating ?? 0))) {
            return false;
        }

        if (filters.photos !== null && (filters.photos === 'with') !== (hotel.photos.length > 0)) {
            return false;
        }

        if (!filters.features.every(value => rate.serpFilters.includes(value))) {
            return false;
        }

        return filters.amenities.every(value => rate.amenitiesData.includes(value));
    });
}

/**
 * @param {object} filters
 * @returns {boolean}
 */
export function hasFilters(filters) {
    return filters.maxPrice !== null
        || filters.stars.length > 0
        || filters.photos !== null
        || filters.features.length > 0
        || filters.amenities.length > 0;
}

function countValue(map, key) {
    map.set(key, (map.get(key) ?? 0) + 1);
}

/**
 * Most useful first, so the longest lists still open on something worth picking.
 */
function getOptions(map) {
    return [...map.entries()]
        .map(([value, count]) => ({value: value, label: prettifyLabel(value), count: count}))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function useHotelUtils() {
    const customerStore = useCustomerStore();

    const criteria = ref(getCriteria());

    // The customer is still loading while this page mounts, so residency is read
    // per request rather than baked into the criteria.
    const residency = computed(() => {
        return customerStore.customer.data?.country?.iso2Alpha ?? DEFAULT_RESIDENCY;
    });

    const nights = computed(() => {
        return moment(criteria.value.checkout).diff(moment(criteria.value.checkin), 'days');
    });

    const stayLabel = computed(() => {
        return `${moment(criteria.value.checkin).format('D MMM')} – ${moment(criteria.value.checkout).format('D MMM YYYY')}`;
    });

    const guestLabel = computed(() => {
        const adults = criteria.value.guests.reduce((total, room) => total + (room.adults ?? 0), 0);
        const children = criteria.value.guests.reduce((total, room) => total + (room.children?.length ?? 0), 0);

        const parts = [`${adults} adult${adults === 1 ? '' : 's'}`];

        if (children > 0) {
            parts.push(`${children} child${children === 1 ? '' : 'ren'}`);
        }

        return parts.join(', ');
    });

    /**
     * Without a query the endpoint answers with its own default list, which is
     * what the destination picker shows before the customer types.
     *
     * @param {string|null} query
     */
    async function regions(query = null) {
        return await axios.get('/client/v1/travel/hotels/catalog/regions', {
            params: {
                q: query,
            },
        });
    }

    async function popularRegions(query = null) {
        return await axios.get('/client/v1/travel/hotels/catalog/popular-regions', {
            params: {
                q: query,
            },
        });
    }

    async function search() {
        return await axios.post('/client/v1/travel/hotels/search/region', {
            ...criteria.value,
            residency: residency.value,
        });
    }

    return {
        criteria,
        nights,
        stayLabel,
        guestLabel,
        search,
        regions,
        popularRegions,
    }
}
