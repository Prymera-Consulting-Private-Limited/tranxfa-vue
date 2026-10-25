import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import {createPinia, setActivePinia} from "pinia";
import {flushPromises, mount} from "@vue/test-utils";
import {createMemoryHistory, createRouter} from "vue-router";
import moment from "moment";
import {fixture} from "./fixtures.js";
import {installFakeEcho} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));

// SD-1839. The supplier's final review books Conrad on screen and asks to see
// every tax by name, the whole cancellation ladder, and a notice when the hotel
// asks another price at the moment of booking. The console sends all three
// since 2026.10.11; the captured fixtures predate it, so the ladder, the named
// taxes and the 409 below are written by hand in the console's documented
// shape (docs/frontend-qa/README.md, sections 6 and 15).
setActivePinia(createPinia());

const axios = (await import('axios')).default;
const {default: CancellationWindow} = await import('@/models/travel/hotels/cancellation_window.js');
const {default: RateCancellation} = await import('@/models/travel/hotels/rate_cancellation.js');
const {default: HotelPriceChange} = await import('@/models/travel/hotels/hotel_price_change.js');
const {default: HotelRate} = await import('@/models/travel/hotels/hotel_rate.js');
const {default: HotelCancellationLadder} = await import('@/views/Travel/Hotels/Partials/HotelCancellationLadder.vue');
const {default: HotelPriceLines} = await import('@/views/Travel/Hotels/Partials/HotelPriceLines.vue');
const {default: HotelRooms} = await import('@/views/Travel/Hotels/Partials/HotelRooms.vue');
const {default: HotelStayCard} = await import('@/views/Travel/Hotels/Partials/HotelStayCard.vue');
const {default: GuestContactForm} = await import('@/views/Travel/Hotels/Partials/GuestContactForm.vue');
const {default: HotelQuoteView} = await import('@/views/Travel/Hotels/HotelQuoteView.vue');

beforeAll(() => {
    installFakeEcho();
});

afterEach(() => {
    vi.clearAllMocks();
});

// Written in local time and read back in it, so the expected text holds in any
// time zone the suite runs in.
const local = value => moment(value).format();

const aud = (amount) => {
    const decimal = (amount / 100).toFixed(2);

    return {amount, decimal, formatted: decimal, prefixed: `AUD ${decimal}`};
};

const money = (key, amount) => {
    if (amount === null) {
        return {[key]: null, [`${key}_decimal`]: null, [`${key}_formatted`]: null, [`${key}_currency_prefixed`]: null};
    }

    const value = aud(amount);

    return {[key]: value.amount, [`${key}_decimal`]: value.decimal, [`${key}_formatted`]: value.formatted, [`${key}_currency_prefixed`]: value.prefixed};
};

const period = (from, until, status, costs) => ({from, until, status, ...money('costs', costs)});

const line = (key, label, amount) => ({key, label, ...money('amount', amount)});

// A free window, then a partial one, then the full price up to the stay.
const LADDER = [
    period(null, local('2026-11-01 12:00'), 'free', 0),
    period(local('2026-11-01 12:00'), local('2026-11-08 12:00'), 'partial', 41365),
    period(local('2026-11-08 12:00'), null, 'non_refundable', 82729),
];

// Every tax inside the price on a line of its own, as the console sends them.
const NAMED_TAXES = [
    line('room', 'Room', 72064),
    line('tax_city_tax', 'City tax', 5140),
    line('tax_vat', 'VAT', 3794),
    line('convenience_fee', 'Convenience fee', 1731),
];

const cancellation = (overrides = {}) => ({
    status: 'free',
    free_until: local('2026-11-01 12:00'),
    changes_at: local('2026-11-01 12:00'),
    ...money('costs_now', 0),
    ...money('refund_now', 82729),
    ladder: LADDER,
    ...overrides,
});

describe('a rate\'s cancellation ladder', () => {
    it('reads every window the console sends, each with its own cost', () => {
        const terms = RateCancellation.getInstance(cancellation());

        expect(terms.ladder).toHaveLength(3);
        expect(terms.ladder[0]).toBeInstanceOf(CancellationWindow);
        expect(terms.ladder[0].from).toBeNull();
        expect(terms.ladder[1].status).toBe('partial');
        expect(terms.ladder[1].costs.currencyPrefixed).toBe('AUD 413.65');
        expect(terms.ladder[2].until).toBeNull();
    });

    it('reads an older console\'s terms, which carry no ladder, as having none', () => {
        const terms = RateCancellation.getInstance(fixture('travel-quote-created').cancellation);

        expect(terms.ladder).toEqual([]);
    });

    it('shows each window\'s span beside what cancelling in it costs', () => {
        const rows = mount(HotelCancellationLadder, {props: {cancellation: RateCancellation.getInstance(cancellation())}})
            .findAll('li')
            .map(row => row.findAll('span').map(part => part.text()));

        expect(rows).toEqual([
            ['Until 1 Nov 2026, 12:00', 'Free'],
            ['1 Nov 2026, 12:00 to 8 Nov 2026, 12:00', 'AUD 413.65'],
            ['From 8 Nov 2026, 12:00', 'AUD 827.29'],
        ]);
    });

    it('says a window that spans the whole stay applies at any time', () => {
        const terms = RateCancellation.getInstance(cancellation({ladder: [period(null, null, 'non_refundable', 82729)]}));
        const text = mount(HotelCancellationLadder, {props: {cancellation: terms}}).text();

        expect(text).toContain('At any time');
        expect(text).toContain('AUD 827.29');
    });

    it('never prices a window the console could not', () => {
        const terms = RateCancellation.getInstance(cancellation({ladder: [period(null, null, 'unknown', null)]}));
        const text = mount(HotelCancellationLadder, {props: {cancellation: terms}}).text();

        expect(text).toContain('Cost not known');
        expect(text).not.toContain('AUD');
    });

    it('renders nothing for terms with no ladder', () => {
        const terms = RateCancellation.getInstance(cancellation({ladder: []}));

        expect(mount(HotelCancellationLadder, {props: {cancellation: terms}}).html()).not.toContain('<li');
    });
});

describe('the lines inside a price', () => {
    const rendered = lines => mount(HotelPriceLines, {props: {lines: HotelRate.getInstance(rate({breakdown: lines})).breakdown}});

    it('names every tax on a line of its own', () => {
        const rows = rendered(NAMED_TAXES).findAll('dl > div').map(row => [row.find('dt').text(), row.find('dd').text()]);

        expect(rows).toEqual([
            ['Room', 'AUD 720.64'],
            ['City tax', 'AUD 51.40'],
            ['VAT', 'AUD 37.94'],
            ['Convenience fee', 'AUD 17.31'],
        ]);
    });

    it('leaves out a line of nothing', () => {
        const text = rendered([...NAMED_TAXES.slice(0, 3), line('convenience_fee', 'Convenience fee', 0)]).text();

        expect(text).toContain('VAT');
        expect(text).not.toContain('Convenience fee');
    });

    it('shows nothing when the room is the only line, since that is the total again', () => {
        expect(rendered([line('room', 'Room', 82729)]).find('dl').exists()).toBe(false);
    });
});

function rate(overrides = {}) {
    return {
        id: 'rt-1',
        token: 'rt-1',
        room_name: 'Standard Double room',
        meal: 'NO-MEAL',
        allotment: 2,
        bookable: true,
        breakdown: NAMED_TAXES,
        ...money('total', 82729),
        per_night: null,
        payable_at_property: null,
        cancellation: cancellation(),
        ...overrides,
    };
}

describe('every rate\'s terms on the hotel page', () => {
    it('can be read without choosing the rate', () => {
        const wrapper = mount(HotelRooms, {props: {rates: [HotelRate.getInstance(rate())], labels: {'NO-MEAL': 'Room only'}}});
        const terms = wrapper.find('details');

        expect(terms.find('summary').text()).toBe('Price and cancellation');
        expect(terms.text()).toContain('City tax');
        expect(terms.text()).toContain('AUD 51.40');
        expect(terms.text()).toContain('Until 1 Nov 2026, 12:00');
        expect(terms.text()).toContain('From 8 Nov 2026, 12:00');
    });

    it('offers nothing to open on a rate that has no more to say', () => {
        const bare = rate({breakdown: [line('room', 'Room', 82729)], cancellation: cancellation({ladder: []})});
        const wrapper = mount(HotelRooms, {props: {rates: [HotelRate.getInstance(bare)], labels: {}}});

        expect(wrapper.find('details').exists()).toBe(false);
    });

    it('sits beside the chosen rate in the stay card', () => {
        const text = mount(HotelStayCard, {props: {selected: HotelRate.getInstance(rate())}}).text();

        expect(text).toContain('City tax');
        expect(text).toContain('VAT');
        expect(text).toContain('Cancellation policy');
        expect(text).toContain('1 Nov 2026, 12:00 to 8 Nov 2026, 12:00');
    });
});

// The guests as GuestContactForm sends them.
const GUESTS = {
    email: 'guest@example.test',
    phone: '0400000000',
    rooms: [{guests: [{first_name: 'Ada', last_name: 'Lovelace', is_child: false}, {first_name: 'Alan', last_name: 'Turing', is_child: false}]}],
};

const heldFor = minutes => new Date(Date.now() + minutes * 60 * 1000).toISOString();

function heldQuote(overrides = {}) {
    return {...fixture('travel-quote-created'), expires_at: heldFor(10), ...overrides};
}

// The new price is a quote of its own, on its own terms.
function restated(total) {
    return heldQuote({
        id: 'quote-conrad-2',
        breakdown: NAMED_TAXES,
        ...money('total', total),
        cancellation: cancellation(),
    });
}

function priceChanged(was, total) {
    return {
        response: {
            status: 409,
            data: {
                message: 'The hotel has changed the price of this room.',
                type: 'hotel_price_changed',
                was: money('total', was),
                quote: restated(total),
            },
        },
    };
}

async function mountQuote(quote = heldQuote()) {
    const blank = {template: '<div />'};
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            {path: '/', component: blank},
            {path: '/travel/hotels', name: 'hotels', component: blank},
            {path: '/travel/booking/:id/pay', name: 'travelBookingPayment', component: blank},
        ],
    });

    await router.push('/');
    await router.isReady();

    axios.get.mockResolvedValue({status: 200, data: quote});

    const wrapper = mount(HotelQuoteView, {
        props: {quoteId: 'quote-conrad-1'},
        global: {
            plugins: [router],
            stubs: {CustomerLayout: {template: '<div><slot /></div>'}},
        },
    });

    await flushPromises();

    return {wrapper, router};
}

async function submitGuests(wrapper) {
    wrapper.findComponent(GuestContactForm).vm.$emit('submit', GUESTS);
    await flushPromises();
}

const button = (wrapper, words) => wrapper.findAll('button').find(candidate => candidate.text().includes(words));

describe('a price the hotel changes at the moment of booking', () => {
    it('reads the refusal as the old total and the new price, held', () => {
        const change = HotelPriceChange.getInstance(priceChanged(82729, 86012).response.data);

        expect(change.was.currencyPrefixed).toBe('AUD 827.29');
        expect(change.quote.id).toBe('quote-conrad-2');
        expect(change.quote.total.currencyPrefixed).toBe('AUD 860.12');
        expect(change.quote.cancellation.ladder).toHaveLength(3);
    });

    it('shows both prices and the new price\'s own terms before anything is booked', async () => {
        const {wrapper} = await mountQuote();
        axios.post.mockRejectedValueOnce(priceChanged(82729, 86012));

        await submitGuests(wrapper);
        const text = wrapper.text();

        expect(text).toContain('The price has changed');
        expect(text).toContain('Nothing has been booked or charged');
        expect(text).toContain('AUD 827.29');
        expect(text).toContain('AUD 860.12');
        expect(text).toContain('City tax');
        expect(text).toContain('From 8 Nov 2026, 12:00');
        expect(button(wrapper, 'Book at').text()).toBe('Book at AUD 860.12');
        // Nothing to type again, so the form gives way to the notice.
        expect(wrapper.findComponent(GuestContactForm).exists()).toBe(false);
    });

    it('gives a lower price the same notice as a higher one', async () => {
        const {wrapper} = await mountQuote();
        axios.post.mockRejectedValueOnce(priceChanged(82729, 79905));

        await submitGuests(wrapper);

        expect(wrapper.text()).toContain('The price has changed');
        expect(button(wrapper, 'Book at').text()).toBe('Book at AUD 799.05');
    });

    it('books the new price with the guests already given, then goes to pay', async () => {
        const {wrapper, router} = await mountQuote();
        axios.post.mockRejectedValueOnce(priceChanged(82729, 86012));
        await submitGuests(wrapper);

        axios.post.mockResolvedValueOnce({status: 201, data: {order: {id: 'order-1'}}});
        await button(wrapper, 'Book at').trigger('click');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledTimes(2);
        expect(axios.post.mock.calls[0]).toEqual(['/client/v1/travel/booking/quote-conrad-1', GUESTS]);
        expect(axios.post.mock.calls[1]).toEqual(['/client/v1/travel/booking/quote-conrad-2', GUESTS]);
        expect(router.currentRoute.value.name).toBe('travelBookingPayment');
        expect(router.currentRoute.value.params.id).toBe('order-1');
    });

    it('goes back to choose again when the new price is declined', async () => {
        const {wrapper, router} = await mountQuote();
        axios.post.mockRejectedValueOnce(priceChanged(82729, 86012));
        await submitGuests(wrapper);

        await button(wrapper, 'Go back').trigger('click');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledTimes(1);
        // Opened straight onto the quote, there is no hotel page to return to.
        expect(router.currentRoute.value.name).toBe('hotels');
    });

    it('returns to the hotel page it came from, which knows the search', async () => {
        const {wrapper, router} = await mountQuote();
        axios.post.mockRejectedValueOnce(priceChanged(82729, 86012));
        await submitGuests(wrapper);

        // A memory history keeps no state; a browser's records the page before.
        router.options.history.state.back = '/travel/hotel/10004834/conrad-los-angeles?search=srch-1';
        const back = vi.spyOn(router, 'back').mockImplementation(() => {});
        const push = vi.spyOn(router, 'push');

        await button(wrapper, 'Go back').trigger('click');

        expect(back).toHaveBeenCalledTimes(1);
        expect(push).not.toHaveBeenCalled();
    });

    it('still reads a 409 without a type as a refusal', async () => {
        const {wrapper} = await mountQuote();
        axios.post.mockRejectedValueOnce({response: {status: 409, data: {message: 'This room is no longer available.'}}});

        await submitGuests(wrapper);
        const text = wrapper.text();

        expect(text).toContain('We couldn\'t complete this booking');
        expect(text).not.toContain('The price has changed');
    });
});

describe('the quote page', () => {
    it('lists every cancellation window beside the price', async () => {
        const {wrapper} = await mountQuote(heldQuote({cancellation: cancellation()}));
        const text = wrapper.text();

        expect(text).toContain('Cancellation policy');
        expect(text).toContain('Until 1 Nov 2026, 12:00');
        expect(text).toContain('From 8 Nov 2026, 12:00');
    });
});
