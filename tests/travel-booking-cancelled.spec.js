import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import {createPinia, setActivePinia} from "pinia";
import {flushPromises, mount} from "@vue/test-utils";
import {createMemoryHistory, createRouter} from "vue-router";
import moment from "moment";
import {fixture} from "./fixtures.js";
import {installFakeEcho} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));

// SD-2080. The hotel confirming a room stays on record after a cancellation,
// because it happened, so a cancelled booking's page still read "Confirmed by
// the hotel" and nothing after it. The console now sends when the booking was
// cancelled, and what the guest still pays at the hotel, which the supplier
// asked to see on the booking page as well as on the quote.
//
// The cancelled booking is written by hand to the console's shape: see
// tests/fixtures/README.md. The complete one is a capture from a console
// before SD-2080, so it carries neither new key.
setActivePinia(createPinia());

const axios = (await import('axios')).default;
const {default: ItemView} = await import('@/views/Travel/Bookings/ItemView.vue');

const blank = {template: '<div />'};

const ROUTES = [
    {path: '/travel/booking/:id/pay', name: 'travelBookingPayment', component: blank},
    {path: '/travel/booking/:id/payment', name: 'travelPaymentStatus', component: blank},
    {path: '/travel/booking/:id', name: 'travelBooking', component: blank},
    {path: '/travel/bookings', name: 'travelBookings', component: blank},
];

const LAYOUT = {CustomerLayout: {template: '<div><slot /></div>'}};

const CANCELLED = 'travel-order-view-cancelled';
const COMPLETE = 'travel-order-view-complete';

// The two charges the console's handout uses: two currencies, one of which
// takes no decimal places.
const charges = () => [
    {name: 'city_tax', currency: 'USD', amount: 1500, amount_decimal: '15.00', amount_formatted: '15.00', amount_currency_prefixed: 'USD 15.00'},
    {name: 'resort_fee', currency: 'JPY', amount: 4000, amount_decimal: '4000', amount_formatted: '4,000', amount_currency_prefixed: 'JPY 4,000'},
];

let mounted = [];

beforeAll(() => {
    installFakeEcho();
});

afterEach(() => {
    // Both fixtures are settled, so nothing polls; unmounted anyway, so a
    // fixture that changes cannot leave a timer running into the next test.
    mounted.forEach(wrapper => wrapper.unmount());
    mounted = [];
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

async function bookingPage(data) {
    axios.get.mockResolvedValue({status: 200, data});

    const router = createRouter({history: createMemoryHistory(), routes: ROUTES});
    await router.push(`/travel/booking/${data.id}`);
    await router.isReady();

    const wrapper = mount(ItemView, {props: {orderId: data.id}, global: {plugins: [router], stubs: LAYOUT}});
    await flushPromises();
    mounted.push(wrapper);

    return wrapper;
}

const section = (wrapper, heading) => wrapper.findAll('section').find(candidate => candidate.find('h2').exists() && candidate.find('h2').text() === heading);

// The stay as it reads, row by row: what each row is, then what it says.
const stayRows = wrapper => section(wrapper, 'Your stay').findAll('dl > div').map(row => [row.find('dt').text(), row.find('dd').text()]);

describe('a cancelled booking on its page', () => {
    it('keeps the hotel\'s confirmation and says, after it, when the booking was cancelled', async () => {
        const data = fixture(CANCELLED);
        const rows = stayRows(await bookingPage(data));
        const labels = rows.map(([label]) => label);
        const confirmed = labels.indexOf('Confirmed by the hotel');

        expect(confirmed).toBeGreaterThan(-1);
        expect(rows[confirmed][1]).toBe(moment(data.confirmed_at).format('lll'));
        expect(rows[confirmed + 1]).toEqual(['Cancelled', moment(data.cancelled_at).format('lll')]);
    });

    it('shows no cancellation on a booking that stands', async () => {
        const labels = stayRows(await bookingPage(fixture(COMPLETE))).map(([label]) => label);

        expect(labels).toContain('Confirmed by the hotel');
        expect(labels).not.toContain('Cancelled');
    });

    it('shows no cancellation when the console says the booking stands', async () => {
        const labels = stayRows(await bookingPage({...fixture(COMPLETE), cancelled_at: null})).map(([label]) => label);

        expect(labels).not.toContain('Cancelled');
    });

    it('owes the hotel nothing once cancelled', async () => {
        const wrapper = await bookingPage(fixture(CANCELLED));

        expect(wrapper.text()).not.toContain('Payable at the hotel');
    });
});

describe('what the hotel collects, on the booking page', () => {
    it('lists each charge in its own currency under what was paid, and leaves the total alone', async () => {
        const data = {...fixture(COMPLETE), payable_at_property: charges()};
        const paid = section(await bookingPage(data), 'What you paid for');
        const lines = paid.findAll('li').map(line => line.text());

        expect(paid.text()).toContain("Payable at the hotel, in the hotel's currency");
        expect(lines).toHaveLength(2);
        expect(lines[0]).toContain('City tax');
        expect(lines[0]).toContain('USD 15.00');
        expect(lines[1]).toContain('Resort fee');
        expect(lines[1]).toContain('JPY 4,000');
        // Not part of what we charged: the total is the console's, untouched.
        expect(paid.find('dl > div:last-child dd').text()).toBe(data.total_currency_prefixed);
    });

    it('shows nothing when nothing is owed', async () => {
        const paid = section(await bookingPage({...fixture(COMPLETE), payable_at_property: []}), 'What you paid for');

        expect(paid.text()).not.toContain('Payable at the hotel');
        expect(paid.find('ul').exists()).toBe(false);
    });

    it('shows nothing, and no "undefined", from a console that does not send them', async () => {
        const wrapper = await bookingPage(fixture(COMPLETE));

        expect(wrapper.text()).not.toContain('Payable at the hotel');
        expect(wrapper.text()).not.toContain('undefined');
    });
});
