import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import {createPinia, setActivePinia} from "pinia";
import {flushPromises, mount} from "@vue/test-utils";
import {createMemoryHistory, createRouter} from "vue-router";
import {fixture, fixtureResponse} from "./fixtures.js";
import {installFakeEcho} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));

// SD-1270. A hotel confirms the room about a minute and a half after booking,
// before anything is paid. The booking page then said "Total paid", "What you
// paid for" and a green "Order Complete", with nothing paid, and a customer
// told they have paid does not pay. The console now says whether a payment
// has succeeded (is_paid) and what the booking is waiting on the customer to
// do (next_step), and words the state accordingly (SD-1230, console #646).
//
// The price-locked and complete order views are captured from Payvel staging;
// the awaiting-hotel one is written from the console's code, because that state
// lasts a minute or two - see tests/fixtures/README.md.
setActivePinia(createPinia());

const axios = (await import('axios')).default;
const {default: Order} = await import('@/models/travel/orders/order.js');
const {default: BookingCard} = await import('@/views/Travel/Bookings/Partials/BookingCard.vue');
const {default: BookingNextStep} = await import('@/views/Travel/Bookings/Partials/BookingNextStep.vue');
const {default: BookingStateBadge} = await import('@/views/Travel/Bookings/Partials/BookingStateBadge.vue');
const {default: ItemView} = await import('@/views/Travel/Bookings/ItemView.vue');
const {default: PaymentView} = await import('@/views/Travel/Bookings/PaymentView.vue');

const blank = {template: '<div />'};

const ROUTES = [
    {path: '/travel/booking/:id/pay', name: 'travelBookingPayment', component: blank},
    {path: '/travel/booking/:id/payment', name: 'travelPaymentStatus', component: blank},
    {path: '/travel/booking/:id', name: 'travelBooking', component: blank},
    {path: '/travel/bookings', name: 'travelBookings', component: blank},
];

const LAYOUT = {CustomerLayout: {template: '<div><slot /></div>'}};

beforeAll(() => {
    installFakeEcho();
});

afterEach(() => {
    vi.clearAllMocks();
});

// The price-locked booking was captured twice on Payvel staging: once while
// a Bank Transfer payment waited on it (deposit-pending), and once after that
// payment was cancelled (price-locked). These are its attempts the first time:
// two that failed, then the open one, with its account details.
const waitingPayments = () => fixture('travel-order-view-deposit-pending').payments;

const LOCKED = '01a0a76b-3e9f-72db-98b0-89f04386670b';
const WAITING_PAYMENT = '01a0b6a0-7dd0-71cd-bab0-d81a26ef6b1e';

function orderOf(name, overrides = {}) {
    return Order.getInstance({...fixture(name), ...overrides});
}

// A console older than SD-1230 sends neither field.
function withoutStatus(name) {
    const data = fixture(name);
    delete data.is_paid;
    delete data.next_step;

    return Order.getInstance(data);
}

async function routerAt(path) {
    const router = createRouter({history: createMemoryHistory(), routes: ROUTES});
    await router.push(path);
    await router.isReady();

    return router;
}

async function mountWithRouter(component, props) {
    const router = await routerAt('/travel/bookings');

    return mount(component, {props, global: {plugins: [router], stubs: LAYOUT}});
}

async function bookingPage(data) {
    axios.get.mockResolvedValue({status: 200, data});

    const router = await routerAt(`/travel/booking/${data.id}`);
    const wrapper = mount(ItemView, {props: {orderId: data.id}, global: {plugins: [router], stubs: LAYOUT}});
    await flushPromises();

    return wrapper;
}

describe('the booking, as the console now describes it', () => {
    it('reads whether it is paid and what it is waiting on', () => {
        const locked = orderOf('travel-order-view-price-locked');
        expect(locked.isPaid).toBe(false);
        expect(locked.nextStep).toEqual({code: 'pay', label: 'Pay for Confirmation'});
        expect(locked.isPriceLocked).toBe(true);

        const complete = orderOf('travel-order-view-complete');
        expect(complete.isPaid).toBe(true);
        expect(complete.nextStep).toBeNull();
        expect(complete.isPriceLocked).toBe(false);

        const awaiting = orderOf('travel-order-view-awaiting-hotel');
        expect(awaiting.isPaid).toBe(false);
        expect(awaiting.nextStep).toBeNull();
        expect(awaiting.isPriceLocked).toBe(false);
        expect(awaiting.isAwaitingHotel).toBe(true);
    });

    // Null is "the console did not say", which is not the same as unpaid.
    it('knows nothing either way from an older console', () => {
        const order = withoutStatus('travel-order-view-price-locked');

        expect(order.isPaid).toBeNull();
        expect(order.nextStep).toBeNull();
        expect(order.isPriceLocked).toBe(false);
    });

    it('finds the payment waiting, from the list or from the booking', () => {
        const fromList = Order.getInstance(fixture('travel-orders-open-payment').data.find(row => row.open_payment));
        expect(fromList.waitingPayment.id).toBe(WAITING_PAYMENT);

        const fromBooking = orderOf('travel-order-view-price-locked', {payments: waitingPayments()});
        expect(fromBooking.waitingPayment.id).toBe(WAITING_PAYMENT);

        expect(orderOf('travel-order-view-price-locked').waitingPayment).toBeNull();
        expect(orderOf('travel-order-view-complete').waitingPayment).toBeNull();
        expect(orderOf('travel-order-view-deposit-failed').waitingPayment).toBeNull();
    });
});

describe('the pay button', () => {
    it('goes to the method picker when nothing is waiting', async () => {
        const wrapper = await mountWithRouter(BookingNextStep, {order: orderOf('travel-order-view-price-locked')});
        const link = wrapper.find('a');

        expect(link.text()).toBe('Pay for Confirmation');
        expect(link.attributes('href')).toBe(`/travel/booking/${LOCKED}/pay`);
    });

    // Paying again would be refused while the first payment holds the account,
    // so the button opens that payment and its account details instead.
    it('goes to the payment already waiting', async () => {
        const order = orderOf('travel-order-view-price-locked', {payments: waitingPayments()});
        const wrapper = await mountWithRouter(BookingNextStep, {order});

        expect(wrapper.find('a').attributes('href')).toBe(`/travel/booking/${LOCKED}/payment`);
    });

    it('uses our own words when the console sends none', async () => {
        const order = orderOf('travel-order-view-price-locked', {next_step: {code: 'pay'}});
        const wrapper = await mountWithRouter(BookingNextStep, {order});

        expect(wrapper.find('a').text()).toBe('Pay for this booking');
    });

    it.each([
        ['nothing is waiting on the customer', 'travel-order-view-complete', {}],
        ['the hotel has not answered yet', 'travel-order-view-awaiting-hotel', {}],
        ['a step this app does not know', 'travel-order-view-price-locked', {next_step: {code: 'sign', label: 'Sign the form'}}],
        ['a step with no code', 'travel-order-view-price-locked', {next_step: {label: 'Pay'}}],
    ])('is not there when %s', async (_, name, overrides) => {
        const wrapper = await mountWithRouter(BookingNextStep, {order: orderOf(name, overrides)});

        expect(wrapper.find('a').exists()).toBe(false);
    });

    it('is on the bookings list row, apart from the link that opens the booking', async () => {
        const data = fixture('travel-orders-open-payment').data.find(row => row.open_payment);
        const order = Order.getInstance(data);
        const wrapper = await mountWithRouter(BookingCard, {order});

        const links = wrapper.findAll('a');
        expect(links.map(link => link.attributes('href'))).toEqual([
            `/travel/booking/${data.id}`,
            `/travel/booking/${data.id}/payment`,
        ]);
        expect(links[1].text()).toBe('Pay for Confirmation');
        // A link inside a link is not valid HTML, and a browser splits it.
        expect(wrapper.find('a a').exists()).toBe(false);
    });

    it('is not on a row with nothing to do', async () => {
        const order = Order.getInstance(fixture('travel-orders-open-payment').data[1]);
        const wrapper = await mountWithRouter(BookingCard, {order});

        expect(wrapper.findAll('a')).toHaveLength(1);
    });
});

describe('the state badge', () => {
    const colourOf = order => mount(BookingStateBadge, {props: {order}}).find('span').classes();

    it('is not green for a room nobody has paid for', () => {
        const classes = colourOf(orderOf('travel-order-view-price-locked'));

        expect(classes.some(name => name.startsWith('bg-success'))).toBe(false);
        expect(classes).toContain('bg-warning-50');
    });

    // The console's label already says the hotel is being asked, so ours beside
    // it said it twice. The dot stays, on the label, to show the page is live.
    it('says once that the hotel has not answered, with the dot on it', () => {
        const wrapper = mount(BookingStateBadge, {props: {order: orderOf('travel-order-view-awaiting-hotel')}});

        expect(wrapper.text()).toBe('Awaiting Hotel Confirmation');
        expect(wrapper.text()).not.toContain('Confirming with the hotel');
        expect(wrapper.findAll(':scope > span')).toHaveLength(1);
        expect(wrapper.find('.animate-ping').exists()).toBe(true);
        expect(mount(BookingStateBadge, {props: {order: orderOf('travel-order-view-complete')}}).find('.animate-ping').exists()).toBe(false);
    });

    it('is green once paid, and for an older console that cannot say', () => {
        expect(colourOf(orderOf('travel-order-view-complete'))).toContain('bg-success-50');
        expect(colourOf(withoutStatus('travel-order-view-price-locked'))).toContain('bg-success-50');
    });

    it('writes the console\'s words for the state', () => {
        expect(mount(BookingStateBadge, {props: {order: orderOf('travel-order-view-price-locked')}}).text()).toContain('Price Locked');
    });
});

describe('the booking page', () => {
    it('never says paid when nothing is', async () => {
        const wrapper = await bookingPage(fixture('travel-order-view-price-locked'));
        const text = wrapper.text();

        expect(text).not.toMatch(/paid/i);
        expect(text).toContain('Total');
        expect(text).toContain('What you\'re paying for');
        expect(text).toContain('Price Locked');
        expect(text).toContain('The hotel has confirmed your room at this price. Please pay to complete your booking.');

        const pay = wrapper.findAll('a').find(link => link.text() === 'Pay for Confirmation');
        expect(pay.attributes('href')).toBe(`/travel/booking/${LOCKED}/pay`);
    });

    it('says paid once it is', async () => {
        const text = (await bookingPage(fixture('travel-order-view-complete'))).text();

        expect(text).toContain('Total paid');
        expect(text).toContain('What you paid for');
        expect(text).toContain('Your order has been delivered.');
    });

    it('keeps its old words for a console that cannot say', async () => {
        const data = fixture('travel-order-view-complete');
        delete data.is_paid;
        delete data.next_step;
        const text = (await bookingPage(data)).text();

        expect(text).toContain('Total paid');
        expect(text).toContain('What you paid for');
    });

    it('says what it is waiting on while the hotel has not answered', async () => {
        const wrapper = await bookingPage(fixture('travel-order-view-awaiting-hotel'));
        const text = wrapper.text();

        expect(text).toContain('Awaiting Hotel Confirmation');
        expect(text).toContain('We have sent your booking to the hotel');
        expect(text).not.toContain('Total paid');
        expect(wrapper.findAll('a').some(link => link.text().startsWith('Pay'))).toBe(false);
    });
});

describe('the payment page', () => {
    const METHODS = [
        {id: 'pm-payid', code: 'PAYID', title: 'PayID', description: 'Pay from your banking app.', providers: [{id: 'pp-1', code: 'MONOOVA', title: 'Monoova'}]},
        {id: 'pm-bank', code: 'BANK-TRANSFER', title: 'Bank transfer', description: null, providers: []},
    ];

    async function paymentPage() {
        axios.get.mockImplementation((url) => (String(url).includes('/travel/payment-methods')
            ? Promise.resolve({status: 200, data: {data: METHODS}})
            : Promise.resolve(fixtureResponse('travel-order-view-price-locked'))));

        const router = await routerAt(`/travel/booking/${LOCKED}/pay`);
        const wrapper = mount(PaymentView, {
            props: {orderId: LOCKED},
            global: {plugins: [router], stubs: LAYOUT},
            attachTo: document.body,
        });
        await flushPromises();

        return wrapper;
    }

    // Paying confirms nothing with the hotel: it has usually confirmed already.
    it('does not say paying confirms the room with the hotel', async () => {
        const wrapper = await paymentPage();

        expect(wrapper.text()).not.toContain('confirm it with the hotel');
        expect(wrapper.text()).toContain('Charming Duplex Home — pay now to complete your booking.');
        wrapper.unmount();
    });

    // Nothing is paid on this page yet, so it says the price is held, in the
    // amber "Price Locked" wears elsewhere, rather than a green "booked".
    it('says the price is locked, not that the room is booked', async () => {
        const wrapper = await paymentPage();
        const banner = wrapper.findAll('p').find(p => p.text() === 'Your room pricing has been locked.');

        expect(banner).toBeTruthy();
        expect(wrapper.text()).not.toContain('Your room is booked');
        expect(banner.element.closest('div.rounded-2xl').className).toContain('bg-warning-50');
        expect(banner.element.closest('div.rounded-2xl').className).not.toMatch(/bg-success/);
        wrapper.unmount();
    });

    it('names each method\'s radio by the method\'s title', async () => {
        const wrapper = await paymentPage();
        const radios = wrapper.findAll('input[name="payment-method"]');

        const names = radios.map(radio => document.getElementById(radio.attributes('aria-labelledby'))?.textContent.trim());
        expect(names).toEqual(['PayID', 'Bank transfer']);

        const detail = document.getElementById(radios[0].attributes('aria-describedby')).textContent;
        expect(detail).toContain('Monoova');
        expect(detail).toContain('Pay from your banking app.');
        wrapper.unmount();
    });
});
