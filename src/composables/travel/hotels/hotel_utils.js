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
 * The hotel page no longer derives its stay from the url — the hotel-view
 * response resolves it server-side instead, as a HotelSearch.
 *
 * @param {HotelSearch} search
 * @returns {object}
 */
export function getCriteriaFromSearch(search) {
    return {
        region_id: search.region?.id ?? null,
        checkin: search.checkin,
        checkout: search.checkout,
        guests: search.guests ?? [],
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
 * The dimensions the supplier's cdn renders for the {size} placeholder. Anything
 * outside its own set comes back as a 404, so every caller picks from here.
 */
export const PHOTO_SIZE = {
    thumbnail: '240x240',
    card: '640x400',
    large: '1024x768',
};

/**
 * Photo urls arrive with a {size} placeholder that has to be swapped for one of
 * the supplier's supported dimensions before the image can be requested.
 *
 * @param {string|null} url
 * @param {string} size
 * @returns {string|null}
 */
export function getPhotoUrl(url, size = PHOTO_SIZE.card) {
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
 * @param {number|string|null} amount
 * @returns {string}
 */
export function formatAmount(amount) {
    return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(amount ?? 0));
}

/**
 * Rates are keyed on the hash a booking is placed against, which is also what
 * makes a selected rate identifiable across a re-render.
 *
 * @param {HotelRate} rate
 * @returns {string}
 */
export function getRateKey(rate) {
    return rate.bookHash ?? rate.matchHash ?? '';
}

/**
 * The supplier returns one rate per room and board combination, so a hotel with
 * three room types can come back as twenty rates. They are grouped the way the
 * stay is actually chosen: pick the room, then pick how it is booked.
 *
 * @param {HotelRate[]} rates
 * @returns {Array<{name: string, rates: HotelRate[], amount: number, currency: string}>}
 */
export function getRoomGroups(rates) {
    const groups = new Map();

    // A rate with no payment option cannot be priced, so it cannot be offered.
    rates.filter(rate => rate.paymentOptions?.paymentTypes?.length > 0).forEach(rate => {
        const name = rate.roomDataTranslation?.mainRoomType || rate.roomName || 'Room';

        groups.set(name, [...(groups.get(name) ?? []), rate]);
    });

    return [...groups.entries()]
        .map(([name, items]) => {
            const sorted = [...items].sort((a, b) => getRateAmount(a) - getRateAmount(b));

            return {
                name: name,
                rates: sorted,
                amount: getRateAmount(sorted[0]),
                currency: getRateCurrency(sorted[0]),
            };
        })
        .sort((a, b) => a.amount - b.amount);
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
 * The order the supplier returns is its own idea of "recommended", so that is
 * the default rather than a sort of its own.
 */
export const SORT_OPTIONS = [
    {value: 'recommended', label: 'Recommended'},
    {value: 'price_asc', label: 'Price: low to high'},
    {value: 'price_desc', label: 'Price: high to low'},
    {value: 'rating_desc', label: 'Star rating'},
];

/**
 * Sorting runs after filtering, against the same cheapest-bookable rate the
 * card shows, so the order on screen always matches the price in front of it.
 *
 * @param {Array<{hotel: Hotel, rate: HotelRate}>} results
 * @param {string} sort
 * @returns {Array<{hotel: Hotel, rate: HotelRate}>}
 */
export function getSortedResults(results, sort) {
    switch (sort) {
        case 'price_asc':
            return [...results].sort((a, b) => getRateAmount(a.rate) - getRateAmount(b.rate));
        case 'price_desc':
            return [...results].sort((a, b) => getRateAmount(b.rate) - getRateAmount(a.rate));
        case 'rating_desc':
            return [...results].sort((a, b) => (b.hotel.starRating ?? 0) - (a.hotel.starRating ?? 0));
        default:
            return results;
    }
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

/**
 * A single value arrives as a plain string, so this only rejects the one
 * shape that can't mean anything here: an empty or missing param.
 *
 * @param {*} value
 * @returns {string|null}
 */
function getQueryString(value) {
    return typeof value === 'string' && value.length ? value : null;
}

/**
 * Feature and amenity text comes straight from the supplier and is never
 * guaranteed to be a clean slug, so it cannot be joined into one param on a
 * delimiter that the text itself might contain. A repeated param is what the
 * router already uses for a real list, so stars/features/amenities go out
 * the same way instead of being comma-joined into a single string.
 *
 * @param {*} value
 * @returns {string[]}
 */
function getQueryList(value) {
    if (Array.isArray(value)) {
        return value.filter(item => typeof item === 'string' && item.length);
    }

    return typeof value === 'string' && value.length ? [value] : [];
}

/**
 * Filters, sort and page are view state rather than part of the search itself,
 * so they live alongside the criteria in the url instead of inside getQuery,
 * and a default never has to appear as a param at all.
 *
 * @param {object} filters
 * @returns {object}
 */
export function getFiltersQuery(filters) {
    return {
        max_price: filters.maxPrice ?? undefined,
        stars: filters.stars.length ? filters.stars.map(String) : undefined,
        photos: filters.photos ?? undefined,
        features: filters.features.length ? filters.features : undefined,
        amenities: filters.amenities.length ? filters.amenities : undefined,
    };
}

/**
 * @param {object} query
 * @returns {object}
 */
export function getFiltersFromQuery(query) {
    const maxPrice = Number.parseFloat(getQueryString(query.max_price));
    const photos = getQueryString(query.photos);

    return {
        maxPrice: Number.isFinite(maxPrice) ? maxPrice : null,
        stars: getQueryList(query.stars).map(value => Number.parseInt(value, 10)).filter(Number.isInteger),
        photos: photos === 'with' || photos === 'without' ? photos : null,
        features: getQueryList(query.features),
        amenities: getQueryList(query.amenities),
    };
}

/**
 * @param {string} sort
 * @returns {string|undefined}
 */
export function getSortQuery(sort) {
    return sort !== SORT_OPTIONS[0].value ? sort : undefined;
}

/**
 * @param {object} query
 * @returns {string}
 */
export function getSortFromQuery(query) {
    const value = getQueryString(query.sort);

    return SORT_OPTIONS.some(option => option.value === value) ? value : SORT_OPTIONS[0].value;
}

/**
 * @param {number} page
 * @returns {string|undefined}
 */
export function getPageQuery(page) {
    return page > 1 ? String(page) : undefined;
}

/**
 * Anything a filter or the result count would rule out is left for the page
 * to clamp, since neither is known while the url is still being parsed.
 *
 * @param {object} query
 * @returns {number}
 */
export function getPageFromQuery(query) {
    const page = Number.parseInt(getQueryString(query.page), 10);

    return Number.isInteger(page) && page > 0 ? page : 1;
}

/**
 * Facilities arrive as a flat list tagged with a group. The supplier leaves the
 * name null whenever it only knows the group, so the group is kept either way and
 * a group with nothing named is still worth showing as a category on its own.
 *
 * @param {HotelFacility[]} facilities
 * @returns {Array<{group: string, items: HotelFacility[]}>}
 */
export function getFacilityGroups(facilities) {
    const groups = new Map();

    facilities.forEach(facility => {
        const group = facility.group ?? 'General';

        groups.set(group, [...(groups.get(group) ?? []), facility]);
    });

    return [...groups.entries()]
        .map(([group, items]) => ({
            group: group,
            items: items
                .filter(facility => facility.name)
                .sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => a.group.localeCompare(b.group));
}

function countValue(map, key) {
    map.set(key, (map.get(key) ?? 0) + 1);
}

/**
 * Each room is priced on its own adults and children, so the breakdown is one
 * line per room rather than a combined total that hides which room a child
 * belongs to. Ages are collected at booking, not shown here.
 *
 * @param {Array<{adults: number, children: number[]}>} guests
 * @returns {string[]}
 */
export function getGuestBreakdown(guests) {
    return guests.map(room => {
        const parts = [`${room.adults} adult${room.adults === 1 ? '' : 's'}`];

        if (room.children.length) {
            parts.push(`${room.children.length} child${room.children.length === 1 ? '' : 'ren'}`);
        }

        return parts.join(', ');
    });
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

    const guestBreakdown = computed(() => getGuestBreakdown(criteria.value.guests));

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

    /**
     * The backend re-resolves the stay from search_id itself, so the request
     * carries nothing but the two opaque ids it was handed.
     *
     * @param {string} searchId
     * @param {string} hotelId
     */
    async function getHotelView(searchId, hotelId) {
        return await axios.post(`/client/v1/travel/hotel/${searchId}/${hotelId}`);
    }

    return {
        criteria,
        nights,
        stayLabel,
        guestBreakdown,
        search,
        getHotelView,
        regions,
        popularRegions,
    }
}
