import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import {createPinia, setActivePinia} from "pinia";
import {flushPromises, mount} from "@vue/test-utils";
import {createMemoryHistory, createRouter} from "vue-router";
import {fixture, fixtureResponse} from "./fixtures.js";
import {installFakeEcho} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));

// SD-1285. The console now takes payment before it books a hotel room
// (SD-1282): booking only opens an order awaiting payment, and the room is booked
// once the payment arrives. Our screens told a customer the room was booked, and
// treated an unpaid order as waiting on the hotel, so it pulsed and was polled
// for good. So was a paid booking the hotel could not provide, which the order's
// own state cannot tell from one still being placed: only fulfilment.state can.
//
// The three order views here are written from the console's handout and its
// wording on develop, not captured: SD-1282 is not on staging yet - see
// tests/fixtures/README.md.
setActivePinia(createPinia());

const axios = (await import('axios')).default;
const {default: Order} = await import('@/models/travel/orders/order.js');
const {default: OrderFulfilmentState} = await import('@/enums/order_fulfilment_state.js');
const {default: OrderPayment} = await import('@/models/travel/orders/order_payment.js');
const {CONFIRMATION_POLL_MS} = await import('@/composables/travel/order_utils.js');
const {default: BookingCard} = await import('@/views/Travel/Bookings/Partials/BookingCard.vue');
const {default: BookingStateBadge} = await import('@/views/Travel/Bookings/Partials/BookingStateBadge.vue');
const {default: GuestContactForm} = await import('@/views/Travel/Hotels/Partials/GuestContactForm.vue');
const {default: ItemView} = await import('@/views/Travel/Bookings/ItemView.vue');
const {default: PaymentStatusView} = await import('@/views/Travel/Bookings/PaymentStatusView.vue');

const blank = {template: '<div />'};

const ROUTES = [
    {path: '/travel/booking/:id/pay', name: 'travelBookingPayment', component: blank},
    {path: '/travel/booking/:id/payment', name: 'travelPaymentStatus', component: blank},
    {path: '/travel/booking/:id', name: 'travelBooking', component: blank},
    {path: '/travel/bookings', name: 'travelBookings', component: blank},
];

const LAYOUT = {CustomerLayout: {template: '<div><slot /></div>'}};

const AWAITING_PAYMENT = 'travel-order-view-awaiting-payment';
const BOOKING_YOUR_ROOM = 'travel-order-view-booking-your-room';
const UNDELIVERED = 'travel-order-view-undelivered';

beforeAll(() => {
    installFakeEcho();
});

afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

const orderOf = (name, overrides = {}) => Order.getInstance({...fixture(name), ...overrides});

// A console from before SD-1282 sends no fulfilment.
function withoutFulfilment(name) {
    const data = fixture(name);
    delete data.fulfilment;

    return Order.getInstance(data);
}

async function routerAt(path) {
    const router = createRouter({history: createMemoryHistory(), routes: ROUTES});
    await router.push(path);
    await router.isReady();

    return router;
}

async function bookingPage(data) {
    axios.get.mockResolvedValue({status: 200, data});

    const router = await routerAt(`/travel/booking/${data.id}`);
    const wrapper = mount(ItemView, {props: {orderId: data.id}, global: {plugins: [router], stubs: LAYOUT}});
    await flushPromises();

    return wrapper;
}

// How many times the page has scheduled another look at the order.
const pollsScheduled = spy => spy.mock.calls.filter(([, delay]) => delay === CONFIRMATION_POLL_MS).length;

describe('how delivering the room is going', () => {
    it('reads the fulfilment, and the strings it is compared with mirror the api', () => {
        const order = orderOf(UNDELIVERED);

        expect(order.fulfilment).toEqual({state: 'UNDELIVERED', label: 'Undelivered'});
        expect(OrderFulfilmentState.UNDELIVERED).toBe('UNDELIVERED');
        expect(Object.values(OrderFulfilmentState)).toEqual(['CREATED', 'QUEUED', 'PROCESSING', 'SUCCESS', 'UNDELIVERED']);
    });

    // Null is "the console did not say", which a console from before SD-1282
    // does not, and where no delivery was ever opened.
    it('is null when the console sends none', () => {
        expect(withoutFulfilment(UNDELIVERED).fulfilment).toBeNull();
        expect(orderOf(UNDELIVERED, {fulfilment: null}).fulfilment).toBeNull();
        expect(orderOf(UNDELIVERED, {fulfilment: {state_label: 'Undelivered'}}).fulfilment).toBeNull();
    });

    it('tells an unpaid order, one being booked and one that failed apart', () => {
        const unpaid = orderOf(AWAITING_PAYMENT);
        expect([unpaid.isAwaitingPayment, unpaid.isAwaitingHotel, unpaid.isUndelivered]).toEqual([true, false, false]);

        const booking = orderOf(BOOKING_YOUR_ROOM);
        expect([booking.isAwaitingPayment, booking.isAwaitingHotel, booking.isUndelivered]).toEqual([false, true, false]);

        // CONFIRMED, paid, not confirmed by the hotel: the same as the one above,
        // except for the one field.
        const failed = orderOf(UNDELIVERED);
        expect([failed.state, failed.isPaid, failed.isConfirmed]).toEqual(['CONFIRMED', true, false]);
        expect([failed.isAwaitingPayment, failed.isAwaitingHotel, failed.isUndelivered]).toEqual([false, false, true]);
    });

    // The label is free text, and the console says never to branch on it.
    it('never decides from the label', () => {
        const lookalike = orderOf(BOOKING_YOUR_ROOM, {state_label: 'Booking Failed', state_description: 'We could not book this room.'});
        expect(lookalike.isUndelivered).toBe(false);
        expect(lookalike.isAwaitingHotel).toBe(true);

        const renamed = orderOf(UNDELIVERED, {state_label: 'Booking Your Room'});
        expect(renamed.isUndelivered).toBe(true);
        expect(renamed.isAwaitingHotel).toBe(false);
    });

    // Bookings made before payment came first, and consoles from before it.
    it('keeps the booking made before SD-1282 waiting on the hotel', () => {
        const awaiting = orderOf('travel-order-view-awaiting-hotel');
        expect([awaiting.isAwaitingHotel, awaiting.isAwaitingPayment, awaiting.isUndelivered]).toEqual([true, false, false]);

        const locked = orderOf('travel-order-view-price-locked');
        expect([locked.isAwaitingHotel, locked.isAwaitingPayment, locked.isPriceLocked]).toEqual([false, true, true]);

        expect(orderOf('travel-order-view-complete').isAwaitingHotel).toBe(false);
    });

    it('still asks about an unpaid order from a console that sends no fulfilment', () => {
        // next_step is what says nothing is waiting on the hotel, fulfilment or not.
        const unpaid = withoutFulfilment(AWAITING_PAYMENT);
        expect([unpaid.isAwaitingPayment, unpaid.isAwaitingHotel]).toEqual([true, false]);

        expect(withoutFulfilment(BOOKING_YOUR_ROOM).isAwaitingHotel).toBe(true);
    });
});

describe('the state badge', () => {
    const badge = name => mount(BookingStateBadge, {props: {order: orderOf(name)}});
    const chip = wrapper => wrapper.find('span');

    it('is amber, and does not pulse, for an order waiting on payment', () => {
        const wrapper = badge(AWAITING_PAYMENT);

        expect(wrapper.text()).toBe('Awaiting Payment');
        expect(chip(wrapper).classes()).toContain('bg-warning-50');
        expect(wrapper.find('.animate-ping').exists()).toBe(false);
    });

    it('pulses, in brand colour, while the room is being booked', () => {
        const wrapper = badge(BOOKING_YOUR_ROOM);

        expect(wrapper.text()).toBe('Booking Your Room');
        expect(chip(wrapper).classes()).toContain('bg-brand-50');
        expect(wrapper.find('.animate-ping').exists()).toBe(true);
    });

    it('is red, does not pulse, and says the order\'s own words for a booking that failed', () => {
        const wrapper = badge(UNDELIVERED);

        expect(wrapper.text()).toBe('Booking Failed');
        expect(wrapper.text()).not.toContain('Undelivered');
        expect(chip(wrapper).classes()).toContain('bg-danger-50');
        expect(wrapper.find('.animate-ping').exists()).toBe(false);
    });
});

describe('the bookings list row', () => {
    async function row(name) {
        const router = await routerAt('/travel/bookings');

        return mount(BookingCard, {props: {order: orderOf(name)}, global: {plugins: [router]}});
    }

    it('offers the console\'s own button to an order awaiting payment', async () => {
        const wrapper = await row(AWAITING_PAYMENT);

        expect(wrapper.text()).toContain('Awaiting Payment');
        expect(wrapper.findAll('a').map(link => link.text())).toContain('Pay to Book');
    });

    it('says what happens next for a booking that failed, and offers no payment', async () => {
        const wrapper = await row(UNDELIVERED);

        expect(wrapper.text()).toContain('Our team will contact you about your refund.');
        expect(wrapper.text()).not.toContain('Undelivered');
        expect(wrapper.findAll('a').map(link => link.text())).not.toContain('Pay to Book');
    });
});

describe('the booking page', () => {
    it('does not ask again about an order waiting on payment, or about one that failed', async () => {
        for (const name of [AWAITING_PAYMENT, UNDELIVERED]) {
            const spy = vi.spyOn(globalThis, 'setTimeout');
            const wrapper = await bookingPage(fixture(name));

            expect(pollsScheduled(spy), name).toBe(0);
            wrapper.unmount();
            spy.mockRestore();
        }
    });

    it('keeps asking while the room is being booked', async () => {
        const spy = vi.spyOn(globalThis, 'setTimeout');
        const wrapper = await bookingPage(fixture(BOOKING_YOUR_ROOM));

        expect(pollsScheduled(spy)).toBe(1);
        wrapper.unmount();
    });

    it('sets the console\'s words for a failed booking apart, and shows nothing of the operator\'s', async () => {
        const wrapper = await bookingPage(fixture(UNDELIVERED));
        const notice = wrapper.findAll('p').find(p => p.text().startsWith('We could not book this room'));

        expect(notice.text()).toContain('Our team will contact you about your refund.');
        expect(notice.classes()).toContain('bg-danger-50');
        expect(wrapper.text()).not.toContain('Undelivered');
        // Paid, so it says what was paid; and nothing left to pay.
        expect(wrapper.text()).toContain('Total paid');
        expect(wrapper.findAll('a').some(link => link.text().startsWith('Pay'))).toBe(false);
    });

    it('says an order waiting on payment is not paid, and offers the button', async () => {
        const wrapper = await bookingPage(fixture(AWAITING_PAYMENT));

        expect(wrapper.text()).toContain('Awaiting Payment');
        expect(wrapper.text()).not.toMatch(/paid for|Total paid/);
        expect(wrapper.findAll('a').find(link => link.text() === 'Pay to Book').attributes('href'))
            .toBe('/travel/booking/01a0b7c0-6666-7777-8888-d99900011122/pay');
    });
});

describe('cancelling an order nobody has paid for', () => {
    const cancelButton = wrapper => wrapper.findAll('button').find(button => button.text() === 'Cancel this booking');

    it('says nothing was booked and nothing is charged, and cancels without asking the hotel', async () => {
        const wrapper = await bookingPage(fixture(AWAITING_PAYMENT));

        expect(wrapper.text()).toContain('We haven\'t booked this room and you haven\'t paid, so cancelling costs you nothing.');
        expect(wrapper.text()).not.toContain('Cancellation charge');
        expect(wrapper.text()).not.toContain('ask the hotel');

        axios.post.mockResolvedValue({status: 200, data: {}});
        await cancelButton(wrapper).trigger('click');
        expect(wrapper.text()).toContain('This closes the booking.');

        await wrapper.findAll('button').find(button => button.text() === 'Yes, cancel this booking').trigger('click');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith('/client/v1/travel/order/01a0b7c0-6666-7777-8888-d99900011122/cancellation');
    });

    // Whether the console sends a free quote for an order it never booked is not
    // known yet, and the customer is told the same either way.
    it('shows no cost rows when the console sends a free quote', async () => {
        const data = fixture(AWAITING_PAYMENT);
        data.cancellation.quote = {is_free: true, is_inside_free_window: true, costs_now: 0, costs_now_decimal: '0.00', costs_now_formatted: '0.00', costs_now_currency_prefixed: 'AUD 0.00', refund_now: 0, refund_now_decimal: '0.00', refund_now_formatted: '0.00', refund_now_currency_prefixed: 'AUD 0.00'};
        const wrapper = await bookingPage(data);

        expect(wrapper.text()).toContain('cancelling costs you nothing');
        expect(wrapper.text()).not.toContain('Cancellation charge');
        expect(cancelButton(wrapper)).toBeTruthy();
    });

    // The api refuses to cancel the order under an open payment, and cancelling
    // a payment has a warning about money already sent, so that is done first,
    // on its own.
    it('points at the payment waiting on it instead of offering a cancel that would be refused', async () => {
        const data = fixture(AWAITING_PAYMENT);
        data.payments = fixture('travel-order-view-deposit-pending').payments.filter(payment => payment.state === 'PENDING');
        const wrapper = await bookingPage(data);

        expect(OrderPayment.getCollection(data.payments)[0].isOpen).toBe(true);
        expect(wrapper.text()).toContain('To cancel this booking, cancel the payment waiting on it first.');
        expect(cancelButton(wrapper)).toBeUndefined();
        expect(wrapper.text()).toContain('Cancel this payment');
    });

    it('leaves a paid booking\'s cancellation as it was', async () => {
        const wrapper = await bookingPage(fixture('travel-order-view-complete'));

        expect(wrapper.text()).toContain('Cancellation charge');
        expect(wrapper.text()).not.toContain('cancelling costs you nothing');
    });

    it('does not offer it for a booking that failed', async () => {
        const wrapper = await bookingPage(fixture(UNDELIVERED));

        expect(cancelButton(wrapper)).toBeUndefined();
    });
});

describe('what the screens say now that payment comes first', () => {
    it('tells somebody who has just paid that the room is being booked, not that it is', async () => {
        axios.get.mockResolvedValue(fixtureResponse('travel-order-view-complete'));
        const router = await routerAt(`/travel/booking/${fixture('travel-order-view-complete').id}/payment`);
        const wrapper = mount(PaymentStatusView, {props: {orderId: fixture('travel-order-view-complete').id}, global: {plugins: [router], stubs: LAYOUT}});
        await flushPromises();

        expect(wrapper.text()).toContain('We\'ve received your payment. We\'re booking your room');
        expect(wrapper.text()).not.toContain('Your room is booked and paid for');
        wrapper.unmount();
    });

    it('asks for a payment on the guest form, not a booking', () => {
        const wrapper = mount(GuestContactForm, {props: {rooms: [{adults: 1, children: []}]}});
        const submit = wrapper.findAll('button').at(-1).text();

        expect(submit).toBe('Continue to payment');
        expect(submit).not.toMatch(/book/i);
    });
});
