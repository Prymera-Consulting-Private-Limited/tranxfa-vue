import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import {createPinia, setActivePinia} from "pinia";
import {flushPromises, mount} from "@vue/test-utils";
import {createMemoryHistory, createRouter} from "vue-router";
import {fixture} from "./fixtures.js";
import {installFakeEcho} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));

// SD-2006. The supplier's certification review read a rate's Room, Resort fee,
// Service fee and Convenience fee, four equal rows, as its own taxes charged
// twice: the two fees are inside the room price it charges us. The console now
// says which line each tax is part of (`included_in`) and sends the room with
// its taxes inside (`amount_with_included`), so every place that draws a price
// shows the room at that figure and names the taxes under it. The fixtures
// carry the new fields by hand until staging serves them - see
// tests/fixtures/README.md.
setActivePinia(createPinia());

const axios = (await import('axios')).default;
const {getIncludedNote, getPriceLines, isItemised} = await import('@/composables/travel/hotels/hotel_utils.js');
const {default: HotelRate} = await import('@/models/travel/hotels/hotel_rate.js');
const {default: HotelPriceChange} = await import('@/models/travel/hotels/hotel_price_change.js');
const {default: TravelQuote} = await import('@/models/travel/quote.js');
const {default: Order} = await import('@/models/travel/orders/order.js');
const {default: HotelPrice} = await import('@/views/Travel/Hotels/Partials/HotelPrice.vue');
const {default: HotelPriceLines} = await import('@/views/Travel/Hotels/Partials/HotelPriceLines.vue');
const {default: HotelRooms} = await import('@/views/Travel/Hotels/Partials/HotelRooms.vue');
const {default: HotelStayCard} = await import('@/views/Travel/Hotels/Partials/HotelStayCard.vue');
const {default: HotelQuoteView} = await import('@/views/Travel/Hotels/HotelQuoteView.vue');
const {default: ItemView} = await import('@/views/Travel/Bookings/ItemView.vue');

beforeAll(() => {
    installFakeEcho();
});

afterEach(() => {
    vi.clearAllMocks();
});

const usd = (key, amount) => {
    const decimal = (amount / 100).toFixed(2);
    const formatted = Number(decimal).toLocaleString('en-US', {minimumFractionDigits: 2});

    return {[key]: amount, [`${key}_decimal`]: decimal, [`${key}_formatted`]: formatted, [`${key}_currency_prefixed`]: `USD ${formatted}`};
};

// A line as a console with SD-2006 sends it.
const line = (key, label, includedIn, amount, withIncluded = amount) => ({
    key,
    label,
    included_in: includedIn,
    ...usd('amount', amount),
    ...usd('amount_with_included', withIncluded),
});

// A line as a console before SD-2006 sends it, and as a flight's still is.
const plain = (key, label, amount) => ({key, label, ...usd('amount', amount)});

// The console's own example: a USD rate with two named taxes inside the room.
const CONRAD = [
    line('room', 'Room', null, 102802, 115546),
    line('tax_resort_fee', 'Resort fee', 'room', 2124),
    line('tax_service_fee', 'Service fee', 'room', 10620),
    line('convenience_fee', 'Convenience fee', null, 4673),
];

const parse = breakdown => TravelQuote.getInstance({id: 'q', breakdown}).breakdown;

// What a customer reads: each row's label, what it names inside it, its figure.
const drawn = breakdown => getPriceLines(parse(breakdown)).map(shown => ({
    label: shown.label,
    includes: shown.included.map(inner => inner.label),
    amount: shown.amount.currencyPrefixed,
}));

// The response as a console before SD-2006 sends it.
const SD_2006_FIELDS = /^(included_in|amount_with_included(_decimal|_formatted|_currency_prefixed)?)$/;

function withoutSd2006(value) {
    if (Array.isArray(value)) {
        return value.map(withoutSd2006);
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value)
            .filter(([key]) => !SD_2006_FIELDS.test(key))
            .map(([key, inner]) => [key, withoutSd2006(inner)]));
    }

    return value;
}

describe('the lines of a price, grouped', () => {
    it('lists the taxes inside the room under it, and shows the room at its price with them', () => {
        expect(drawn(CONRAD)).toEqual([
            {label: 'Room', includes: ['Resort fee', 'Service fee'], amount: 'USD 1,155.46'},
            {label: 'Convenience fee', includes: [], amount: 'USD 46.73'},
        ]);
    });

    it('names each tax under the room at its own figure', () => {
        const [room] = getPriceLines(parse(CONRAD));

        expect(room.included.map(inner => inner.amount.currencyPrefixed)).toEqual(['USD 21.24', 'USD 106.20']);
        expect(getIncludedNote(room)).toBe('includes Resort fee USD 21.24 and Service fee USD 106.20');
        expect(getIncludedNote(room, 'formatted')).toBe('includes Resort fee 21.24 and Service fee 106.20');
    });

    // The room's figure is the api's, never a sum worked out here: a client
    // that adds money up is one zero-decimal currency away from a wrong price.
    it('shows the room\'s figure as the api sent it, adding nothing up', () => {
        const [room] = drawn([line('room', 'Room', null, 102802, 999999), ...CONRAD.slice(1)]);

        expect(room.amount).toBe('USD 9,999.99');
    });

    it('draws lines that name no other as they were always drawn', () => {
        const old = [plain('room', 'Room', 72064), plain('taxes_and_fees', 'Taxes and fees', 8934), plain('convenience_fee', 'Convenience fee', 1731)];

        expect(drawn(old)).toEqual([
            {label: 'Room', includes: [], amount: 'USD 720.64'},
            {label: 'Taxes and fees', includes: [], amount: 'USD 89.34'},
            {label: 'Convenience fee', includes: [], amount: 'USD 17.31'},
        ]);
    });

    it('draws a flight\'s lines, which are charged beside the fare, as they were always drawn', () => {
        const order = Order.getInstance({id: 'o', breakdown: [plain('fare', 'Fare', 30000), plain('taxes', 'Taxes', 4500), plain('convenience_fee', 'Convenience fee', 900)]});

        expect(getPriceLines(order.breakdown).map(shown => [shown.label, shown.included.length, shown.amount.currencyPrefixed])).toEqual([
            ['Fare', 0, 'USD 300.00'],
            ['Taxes', 0, 'USD 45.00'],
            ['Convenience fee', 0, 'USD 9.00'],
        ]);
    });

    it('leaves out a line of nothing, as it always did', () => {
        expect(drawn([plain('room', 'Room', 72064), plain('taxes_and_fees', 'Taxes and fees', 0)]).map(shown => shown.label)).toEqual(['Room']);
    });

    it('does not name a tax of nothing', () => {
        const breakdown = [
            line('room', 'Room', null, 72064, 74188),
            line('tax_city_tax', 'City tax', 'room', 0),
            line('tax_resort_fee', 'Resort fee', 'room', 2124),
            line('convenience_fee', 'Convenience fee', null, 1731),
        ];

        expect(drawn(breakdown)[0]).toEqual({label: 'Room', includes: ['Resort fee'], amount: 'USD 741.88'});
        expect(drawn(breakdown).map(shown => shown.label)).not.toContain('City tax');
    });

    it('keeps a line that names a line not in the price on a row of its own', () => {
        const breakdown = [line('tax_resort_fee', 'Resort fee', 'room', 2124), line('convenience_fee', 'Convenience fee', null, 4673)];

        expect(drawn(breakdown)).toEqual([
            {label: 'Resort fee', includes: [], amount: 'USD 21.24'},
            {label: 'Convenience fee', includes: [], amount: 'USD 46.73'},
        ]);
    });

    // Only a line drawn as a row can hold another, so nothing vanishes with its
    // money inside a line that is itself listed under a third.
    it('keeps a line inside a line that is itself inside another on a row of its own', () => {
        const breakdown = [
            line('room', 'Room', null, 100000, 110000),
            line('tax_vat', 'VAT', 'room', 10000),
            line('tax_vat_surcharge', 'VAT surcharge', 'tax_vat', 500),
        ];

        expect(drawn(breakdown)).toEqual([
            {label: 'Room', includes: ['VAT'], amount: 'USD 1,100.00'},
            {label: 'VAT surcharge', includes: [], amount: 'USD 5.00'},
        ]);
    });

    it('is worth drawing beside the total when it has two lines, or taxes inside its one', () => {
        expect(isItemised(getPriceLines(parse(CONRAD)))).toBe(true);
        expect(isItemised(getPriceLines(parse(CONRAD.slice(0, 3))))).toBe(true);
        expect(isItemised(getPriceLines(parse([plain('room', 'Room', 82729)])))).toBe(false);
        // A room whose only tax is nothing is the total under another name.
        expect(isItemised(getPriceLines(parse([line('room', 'Room', null, 82729), line('tax_city_tax', 'City tax', 'room', 0)])))).toBe(false);
    });
});

// Each row of a list of price lines, as a customer reads it: the label, the
// taxes named under it, and the figure in the amounts' column.
function rows(list) {
    return list.findAll(':scope > div').map(row => {
        const term = row.find('dt');
        const note = term.findAll('span').find(span => span.text().startsWith('includes'));

        return {
            label: term.text().replace(note?.text() ?? '', '').replace(/\s+/g, ' ').trim(),
            includes: note ? note.text() : null,
            amount: row.find('dd').text(),
        };
    });
}

const router = async () => {
    const blank = {template: '<div />'};
    const memory = createRouter({
        history: createMemoryHistory(),
        routes: [
            {path: '/', component: blank},
            {path: '/travel/hotels', name: 'hotels', component: blank},
            {path: '/travel/bookings', name: 'travelBookings', component: blank},
            {path: '/travel/booking/:id', name: 'travelBooking', component: blank},
            {path: '/travel/booking/:id/pay', name: 'travelBookingPayment', component: blank},
            {path: '/travel/booking/:id/payment', name: 'travelPaymentStatus', component: blank},
        ],
    });

    await memory.push('/');
    await memory.isReady();

    return memory;
};

async function mountPage(component, props, response) {
    axios.get.mockResolvedValue({status: 200, data: response});

    const wrapper = mount(component, {
        props,
        global: {plugins: [await router()], stubs: {CustomerLayout: {template: '<div><slot /></div>'}}},
    });

    await flushPromises();

    return wrapper;
}

const section = (wrapper, heading) => wrapper.findAll('section').find(candidate => candidate.find('h2').exists() && candidate.find('h2').text() === heading);

const searchCard = response => mount(HotelPrice, {
    props: {rate: HotelRate.getInstance(response.hotels[1].cheapest_rate), money: {currency: 'AUD', decimalPlaces: 2}, nights: 3},
});

const roomRow = response => mount(HotelRooms, {props: {rates: [HotelRate.getInstance(response.rates[0])], labels: response.labels}}).find('details dl');

const yourPrice = async response => section(await mountPage(HotelQuoteView, {quoteId: 'quote-conrad-1'}, response), 'Your price').find('dl');

async function whatYoureFor(response) {
    const wrapper = await mountPage(ItemView, {orderId: response.id}, response);
    const list = section(wrapper, 'What you\'re paying for').find('dl');
    const read = rows(list);

    // The booking is awaiting the hotel, so the page polls until it is gone.
    wrapper.unmount();

    return read;
}

describe('every place a hotel price is drawn', () => {
    // The card states the currency once, beside the total, so its lines are
    // bare figures, as they always were.
    it('shows the room with its taxes on the search card, and names them under it', () => {
        expect(rows(searchCard(fixture('travel-hotels-search-region')).find('dl'))).toEqual([
            {label: 'Room', includes: 'includes Resort fee 14.87 and Service fee 74.47', amount: '809.98'},
            {label: 'Convenience fee', includes: null, amount: '17.31'},
        ]);
    });

    it('does not name a tax of nothing on the search card', () => {
        const card = mount(HotelPrice, {
            props: {rate: HotelRate.getInstance(fixture('travel-hotels-search-region').hotels[0].cheapest_rate), money: {currency: 'AUD', decimalPlaces: 2}, nights: 3},
        });

        expect(rows(card.find('dl'))).toEqual([
            {label: 'Room', includes: null, amount: '434.90'},
            {label: 'Convenience fee', includes: null, amount: '12.11'},
        ]);
    });

    it('shows the room with its taxes in a room row on the hotel page', () => {
        expect(rows(roomRow(fixture('travel-hotel-view-extras')))).toEqual([
            {label: 'Room', includes: 'includes Resort fee AUD 14.87 and Service fee AUD 74.47', amount: 'AUD 809.98'},
            {label: 'Convenience fee', includes: null, amount: 'AUD 17.31'},
        ]);
    });

    it('names a single taxes line under the room as well', () => {
        const wrapper = mount(HotelRooms, {props: {rates: [HotelRate.getInstance(fixture('travel-hotel-view-extras').rates[1])], labels: {}}});

        expect(rows(wrapper.find('details dl'))[0]).toEqual({label: 'Room', includes: 'includes Taxes and fees AUD 89.34', amount: 'AUD 809.98'});
    });

    it('shows the room with its taxes beside the chosen rate', () => {
        const card = mount(HotelStayCard, {props: {selected: HotelRate.getInstance(fixture('travel-hotel-view-extras').rates[0])}});

        expect(rows(card.find('dl'))[0]).toEqual({label: 'Room', includes: 'includes Resort fee AUD 14.87 and Service fee AUD 74.47', amount: 'AUD 809.98'});
    });

    it('shows the room with its taxes in the quote\'s "Your price"', async () => {
        const quote = {...fixture('travel-quote-created'), expires_at: new Date(Date.now() + 600000).toISOString()};
        const shown = rows(await yourPrice(quote));

        expect(shown.slice(0, 2)).toEqual([
            {label: 'Room', includes: 'includes Resort fee AUD 14.87 and Service fee AUD 74.47', amount: 'AUD 809.98'},
            {label: 'Convenience fee', includes: null, amount: 'AUD 17.31'},
        ]);
        expect(shown[2].label).toBe('Total');
        expect(shown[2].amount).toContain('AUD 827.29');
    });

    it('shows the room with its taxes in the new price the hotel asks at booking', () => {
        const change = HotelPriceChange.getInstance({type: 'hotel_price_changed', was: usd('total', 118000), quote: {id: 'q2', breakdown: CONRAD}});

        expect(rows(mount(HotelPriceLines, {props: {lines: change.quote.breakdown}}).find('dl'))).toEqual([
            {label: 'Room', includes: 'includes Resort fee USD 21.24 and Service fee USD 106.20', amount: 'USD 1,155.46'},
            {label: 'Convenience fee', includes: null, amount: 'USD 46.73'},
        ]);
    });

    it('shows the room with its taxes in the booking\'s "What you\'re paying for"', async () => {
        const shown = await whatYoureFor(fixture('travel-order-view-awaiting-hotel'));

        expect(shown.slice(0, 2)).toEqual([
            {label: 'Room', includes: 'includes Resort fee AUD 8.06 and Service fee AUD 40.31', amount: 'AUD 451.47'},
            {label: 'Convenience fee', includes: null, amount: 'AUD 31.03'},
        ]);
        expect(shown[2]).toEqual({label: 'Total', includes: null, amount: 'AUD 482.50'});
    });
});

// Production consoles stay without the new fields until they are updated, so a
// response without them must read exactly as before.
describe('a price from a console before SD-2006', () => {
    it('reads on the search card as it always did', () => {
        expect(rows(searchCard(withoutSd2006(fixture('travel-hotels-search-region'))).find('dl'))).toEqual([
            {label: 'Room', includes: null, amount: '720.64'},
            {label: 'Resort fee', includes: null, amount: '14.87'},
            {label: 'Service fee', includes: null, amount: '74.47'},
            {label: 'Convenience fee', includes: null, amount: '17.31'},
        ]);
    });

    it('reads in a room row on the hotel page as it always did', () => {
        // travel-hotel-view is kept without the new fields, as that console sends it.
        expect(rows(roomRow(fixture('travel-hotel-view')))).toEqual([
            {label: 'Room', includes: null, amount: 'AUD 720.64'},
            {label: 'Taxes and fees', includes: null, amount: 'AUD 89.34'},
            {label: 'Convenience fee', includes: null, amount: 'AUD 17.31'},
        ]);
    });

    it('reads beside the chosen rate as it always did', () => {
        const card = mount(HotelStayCard, {props: {selected: HotelRate.getInstance(fixture('travel-hotel-view').rates[0])}});

        expect(rows(card.find('dl')).map(shown => shown.label)).toEqual(['Room', 'Taxes and fees', 'Convenience fee']);
    });

    it('reads in the quote\'s "Your price" as it always did', async () => {
        const quote = withoutSd2006({...fixture('travel-quote-created'), expires_at: new Date(Date.now() + 600000).toISOString()});

        expect(rows(await yourPrice(quote)).slice(0, 4)).toEqual([
            {label: 'Room', includes: null, amount: 'AUD 720.64'},
            {label: 'Resort fee', includes: null, amount: 'AUD 14.87'},
            {label: 'Service fee', includes: null, amount: 'AUD 74.47'},
            {label: 'Convenience fee', includes: null, amount: 'AUD 17.31'},
        ]);
    });

    it('reads in the booking\'s "What you\'re paying for" as it always did', async () => {
        const shown = await whatYoureFor(withoutSd2006(fixture('travel-order-view-awaiting-hotel')));

        expect(shown.map(row => [row.label, row.amount])).toEqual([
            ['Room', 'AUD 403.10'],
            ['Resort fee', 'AUD 8.06'],
            ['Service fee', 'AUD 40.31'],
            ['Convenience fee', 'AUD 31.03'],
            ['Total', 'AUD 482.50'],
        ]);
    });
});
