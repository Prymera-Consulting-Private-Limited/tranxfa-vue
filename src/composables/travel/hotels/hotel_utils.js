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
export const MAX_STAY_NIGHTS = 30;
export const MAX_CHECKIN_DAYS = 730;

/**
 * Only used until the customer's own country is loaded, since the supplier
 * prices on residency.
 */
const DEFAULT_RESIDENCY = 'AU';

/**
 * Bounds what the supplier sends the backend. Their own cap of 500 applies after
 * it, so at this figure we never meet it.
 */
const HOTELS_LIMIT = 250;

/**
 * The destination lookup rejects anything shorter, so the picker does not ask.
 */
export const REGION_QUERY_MIN = 2;

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

    return {
        // A repeated ?region= arrives as an array, which is not an id.
        region_id: typeof query.region === 'string' && query.region.length ? query.region : null,
        checkin: checkin,
        checkout: getCheckoutDate(query.checkout, checkin),
        guests: getGuests(query.guests),
    };
}

/**
 * The criteria are named for the url, which is their other job and which shared
 * links depend on. The api names the same things differently, so the two are
 * mapped here rather than one of them being bent to the other.
 *
 * Currency is deliberately absent: a customer is quoted in their own country's
 * currency, and asking for another would only be a way to get that wrong.
 *
 * @param {object} criteria
 * @param {string} residency
 * @returns {object}
 */
export function getSearchPayload(criteria, residency) {
    return {
        region_id: criteria.region_id,
        check_in: criteria.checkin,
        check_out: criteria.checkout,
        residency: residency,
        rooms: criteria.guests.map(room => ({
            adults: room.adults,
            children_ages: room.children,
        })),
        hotels_limit: HOTELS_LIMIT,
    };
}

/**
 * The supplier returns one rate per room and board combination, so a hotel with
 * three room types can come back as twenty rates. They are grouped the way a stay
 * is actually chosen: pick the room, then pick how it is booked.
 *
 * Each rate keeps its own price, terms and token throughout — a group's "from"
 * figure is the cheapest rate's own total and never travels with another rate's
 * cancellation.
 *
 * @param {HotelRate[]} rates
 * @returns {Array<{name: string, rates: HotelRate[], from: Money}>}
 */
export function getRateGroups(rates) {
    const groups = new Map();

    rates.forEach(rate => {
        const name = rate.roomName || 'Room';

        groups.set(name, [...(groups.get(name) ?? []), rate]);
    });

    return [...groups.entries()]
        .map(([name, items]) => {
            const sorted = [...items].sort((a, b) => a.total.amount - b.total.amount);

            return {
                name: name,
                rates: sorted,
                from: sorted[0].total,
            };
        })
        .sort((a, b) => a.from.amount - b.from.amount);
}

/**
 * @param {HotelRate[]} rates
 * @returns {HotelRate|null}
 */
export function getCheapestRate(rates) {
    const bookable = rates.filter(rate => rate.bookable && rate.token);

    if (bookable.length === 0) {
        return null;
    }

    return bookable.reduce((cheapest, rate) => (rate.total.amount < cheapest.total.amount ? rate : cheapest));
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
 * A stay in the past cannot be priced, and the supplier won't quote a check-in
 * beyond MAX_CHECKIN_DAYS out, so either falls back to the default window.
 *
 * @param {string|undefined} value
 * @param {number} fallbackDays
 * @returns {string}
 */
function getStayDate(value, fallbackDays) {
    const date = moment(value, DATE_FORMAT, true);
    const latest = moment().add(MAX_CHECKIN_DAYS, 'days').startOf('day');

    if (!date.isValid() || date.isBefore(moment().startOf('day')) || date.isAfter(latest)) {
        return moment().add(fallbackDays, 'days').format(DATE_FORMAT);
    }

    return date.format(DATE_FORMAT);
}

/**
 * A stay longer than MAX_STAY_NIGHTS cannot be priced, so a checkout outside
 * one night to MAX_STAY_NIGHTS nights after check-in falls back to one night.
 *
 * @param {string|undefined} value
 * @param {string} checkin
 * @returns {string}
 */
function getCheckoutDate(value, checkin) {
    const date = moment(value, DATE_FORMAT, true);
    const earliest = moment(checkin).add(1, 'day');
    const latest = moment(checkin).add(MAX_STAY_NIGHTS, 'days');

    if (!date.isValid() || date.isBefore(earliest) || date.isAfter(latest)) {
        return earliest.format(DATE_FORMAT);
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
 * How the backend states a rate's cancellation terms, already resolved for now.
 * "unknown" is a real answer rather than missing data: some supplier rates carry
 * no terms at all, and neither promising a refund nor threatening a penalty would
 * be true.
 */
export const CANCELLATION_STATUS = {
    free: 'free',
    partial: 'partial',
    nonRefundable: 'non_refundable',
    unknown: 'unknown',
};

/**
 * Search photos arrive ready to request at each size. This is only still needed
 * on the hotel page, whose urls carry the supplier's {size} placeholder — and
 * anything outside its own set of dimensions comes back as a 404, so every
 * caller picks from here.
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
 * The price slider only. Its position is a value between two rates that exists
 * nowhere in the response, so it is the one amount no set of pre-rendered strings
 * can cover — every amount the api actually sent arrives already formatted and is
 * shown as it was sent.
 *
 * Even here nothing is assumed — 23000 is 230.00 in USD and 23000 in JPY, so the
 * response's own decimal places decide.
 *
 * @param {number|null} amount
 * @param {{currency: string, decimalPlaces: number}} money
 * @returns {string}
 */
export function formatMoney(amount, money) {
    const places = Number.isInteger(money?.decimalPlaces) ? money.decimalPlaces : 2;

    return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: places,
        maximumFractionDigits: places,
    }).format(Number(amount ?? 0) / 10 ** places);
}

/**
 * A search is filtered in the browser, since one region search already returns
 * every hotel we are allowed to show.
 *
 * @returns {{maxPrice: number|null, stars: number[], photos: string|null, amenities: string[]}}
 */
export function getFilters() {
    return {
        // In minor units, like every other amount a search carries.
        maxPrice: null,
        stars: [],
        // Either "with", "without", or no preference at all.
        photos: null,
        amenities: [],
    };
}

/**
 * Counts are taken over the whole result set rather than the filtered one, so an
 * option never reads as empty just because another group is narrowing it.
 *
 * @param {Hotel[]} hotels
 * @param {{currency: string, decimalPlaces: number}} money
 * @param {object} labels
 * @returns {object}
 */
export function getFacets(hotels, money, labels = {}) {
    const prices = hotels.map(hotel => hotel.cheapestRate.total.amount);
    const stars = new Map();
    const amenities = new Map();
    const photos = {with: 0, without: 0};

    hotels.forEach(hotel => {
        // Unrated arrives as null, and a 0 would be an apartment or a guest
        // house rather than a rating either way.
        if (hotel.starRating) {
            countValue(stars, Math.round(hotel.starRating));
        }

        photos[hotel.photo ? 'with' : 'without'] += 1;

        hotel.amenities.forEach(value => countValue(amenities, value));
    });

    return {
        photos: photos,
        price: {
            // One currency per response, stated by the response itself — never
            // read off a rate, which no longer carries one.
            currency: money.currency,
            min: prices.length ? Math.min(...prices) : 0,
            max: prices.length ? Math.max(...prices) : 0,
        },
        stars: [...stars.entries()]
            .map(([value, count]) => ({value: value, count: count}))
            .sort((a, b) => b.value - a.value),
        amenities: getOptions(amenities, labels),
    };
}

/**
 * Filters run against the rate the card shows, which is the one the search
 * returned, so the price and the badges on screen always match what was
 * filtered.
 *
 * @param {Hotel[]} hotels
 * @param {object} filters
 * @returns {Hotel[]}
 */
export function getFilteredResults(hotels, filters) {
    return hotels.filter(hotel => {
        if (filters.maxPrice !== null && hotel.cheapestRate.total.amount > filters.maxPrice) {
            return false;
        }

        if (filters.stars.length && !filters.stars.includes(Math.round(hotel.starRating ?? 0))) {
            return false;
        }

        if (filters.photos !== null && (filters.photos === 'with') !== (hotel.photo !== null)) {
            return false;
        }

        return filters.amenities.every(value => hotel.amenities.includes(value));
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
 * Sorting runs after filtering, against the same rate the card shows, so the
 * order on screen always matches the price in front of it.
 *
 * @param {Hotel[]} hotels
 * @param {string} sort
 * @returns {Hotel[]}
 */
export function getSortedResults(hotels, sort) {
    switch (sort) {
        case 'price_asc':
            return [...hotels].sort((a, b) => a.cheapestRate.total.amount - b.cheapestRate.total.amount);
        case 'price_desc':
            return [...hotels].sort((a, b) => b.cheapestRate.total.amount - a.cheapestRate.total.amount);
        case 'rating_desc':
            return [...hotels].sort((a, b) => (b.starRating ?? 0) - (a.starRating ?? 0));
        default:
            return hotels;
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
 * Amenity codes come straight from the supplier and are never guaranteed to be
 * clean slugs, so they cannot be joined into one param on a delimiter the code
 * itself might contain. A repeated param is what the router already uses for a
 * real list, so stars and amenities go out the same way instead of being
 * comma-joined into a single string.
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
        amenities: filters.amenities.length ? filters.amenities : undefined,
    };
}

/**
 * @param {object} query
 * @returns {object}
 */
export function getFiltersFromQuery(query) {
    // Minor units, so a fractional cap could only come from a hand-edited url.
    const maxPrice = Number.parseInt(getQueryString(query.max_price), 10);
    const photos = getQueryString(query.photos);

    return {
        maxPrice: Number.isInteger(maxPrice) ? maxPrice : null,
        stars: getQueryList(query.stars).map(value => Number.parseInt(value, 10)).filter(Number.isInteger),
        photos: photos === 'with' || photos === 'without' ? photos : null,
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
 * Display text comes from the response's own dictionary — prettifying a code we
 * were not given a label for is a last resort, since it is what used to put
 * "Non smoking" in front of a customer.
 */
function getOptions(map, labels) {
    return [...map.entries()]
        .map(([value, count]) => ({value: value, label: labels[value] ?? prettifyLabel(value), count: count}))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function useHotelUtils() {
    const customerStore = useCustomerStore();

    const criteria = ref(getCriteria());

    // The customer is still loading while this page mounts, so residency is read
    // per request rather than baked into the criteria.
    const residency = computed(() => {
        return customerStore.customer.data?.nationality?.iso2Alpha ?? DEFAULT_RESIDENCY;
    });

    const nights = computed(() => {
        return moment(criteria.value.checkout).diff(moment(criteria.value.checkin), 'days');
    });

    const stayLabel = computed(() => {
        return `${moment(criteria.value.checkin).format('D MMM')} – ${moment(criteria.value.checkout).format('D MMM YYYY')}`;
    });

    const guestBreakdown = computed(() => getGuestBreakdown(criteria.value.guests));

    /**
     * With a query this searches; without one it answers the destinations an
     * operator has curated, and says which it gave us in is_featured. Either way
     * only places a supplier actually covers are offered, so an empty list means
     * we cannot search there rather than that the place does not exist.
     *
     * @param {string|null} query At least REGION_QUERY_MIN characters, or null.
     */
    async function regions(query = null) {
        return await axios.get('/client/v1/travel/regions', {
            params: {
                query: query ?? undefined,
            },
        });
    }

    async function search() {
        return await axios.post('/client/v1/travel/hotels/search/region', getSearchPayload(criteria.value, residency.value));
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

    /**
     * Holds the chosen rate's price. The supplier is asked for this hotel again
     * and the token is looked for in its current answer, so a room that has gone
     * in the meantime comes back as a 409 — an ordinary answer rather than an
     * error, since a room can sell out between reading about it and choosing it.
     *
     * @param {string} searchId
     * @param {string} hotelId
     * @param {string} token From the rate on the hotel page, and nowhere else.
     */
    async function createQuote(searchId, hotelId, token) {
        return await axios.post(`/client/v1/travel/hotel/quote/${searchId}/${hotelId}`, {
            token: token,
        });
    }

    /**
     * Re-reads a held quote. Its cancellation terms are worked out again on every
     * read, so this is called on opening rather than the response being cached.
     * Past its expiry the answer is a 410 carrying a message to show.
     *
     * @param {string} quoteId
     */
    async function getQuote(quoteId) {
        return await axios.get(`/client/v1/travel/quote/${quoteId}`);
    }

    /**
     * Fetches the priced, ready-to-book quote a prebook resolves into.
     *
     * @param {string} quoteId
     */
    async function getHotelQuote(quoteId) {
        return await axios.get(`/client/v1/travel/hotel/quote/${quoteId}`);
    }

    /**
     * Starts the booking against a quote — the step a "Continue Booking" or a
     * price-change confirmation both funnel into, since either one is the
     * customer's go-ahead to book at the price the quote is currently showing.
     *
     * @param {string} quoteId
     */
    async function bookHotel(quoteId) {
        return await axios.post(`/client/v1/travel/hotel/book/${quoteId}`);
    }

    /**
     * Re-fetches a booking attempt already in progress, so landing on its url
     * directly — a refresh mid-flow, a shared link — resumes it instead of
     * having nothing to show until "book" is clicked again.
     *
     * @param {string} attemptId
     */
    async function getBookingAttempt(attemptId) {
        return await axios.get(`/client/v1/travel/hotel/booking-attempt/${attemptId}`);
    }

    /**
     * Saves whichever guests the customer has real names for, against their
     * pre-created slots on the attempt. Callable repeatedly while the attempt
     * is still "form_started" — each call only touches the guests it mentions,
     * so a partial fill now and the rest later both work. Rejected with a 409
     * once the attempt has moved past guest collection.
     *
     * @param {string} attemptId
     * @param {{guests: Array}} payload
     */
    async function saveBookingGuests(attemptId, payload) {
        return await axios.put(`/client/v1/travel/hotel/booking-attempt/${attemptId}/guests`, payload);
    }

    return {
        criteria,
        nights,
        stayLabel,
        guestBreakdown,
        search,
        getHotelView,
        createQuote,
        getQuote,
        getHotelQuote,
        bookHotel,
        getBookingAttempt,
        saveBookingGuests,
        regions,
    }
}
