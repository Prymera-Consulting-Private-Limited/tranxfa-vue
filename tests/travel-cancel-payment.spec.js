import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import {createPinia, setActivePinia} from "pinia";
import {flushPromises, mount} from "@vue/test-utils";
import {createMemoryHistory, createRouter} from "vue-router";
import {fixture, fixtureError, fixtureResponse} from "./fixtures.js";
import {installFakeEcho} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));

// SD-1269. A PayID or bank transfer payment holds the customer's deposit
// account until it is paid or cancelled, for up to 30 hours on Payvel, and every
// other payment into that account is refused meanwhile. The app told them to
// "pay or cancel it" and offered no way to cancel a hotel payment. The console
// now has one (SD-1261): POST /travel/order/{order}/payment/{payment}/cancel.
//
// The cancel fixtures are captured from Payvel staging - see
// tests/fixtures/README.md.
setActivePinia(createPinia());

const axios = (await import('axios')).default;
const {default: OrderPayment} = await import('@/models/travel/orders/order_payment.js');
const {default: CancelPaymentAction} = await import('@/views/Travel/Bookings/Partials/CancelPaymentAction.vue');
const {default: PaymentView} = await import('@/views/Travel/Bookings/PaymentView.vue');
const {default: PaymentStatusView} = await import('@/views/Travel/Bookings/PaymentStatusView.vue');
const {default: ItemView} = await import('@/views/Travel/Bookings/ItemView.vue');

const ORDER = '01a0b2c0-1111-7222-8333-944455566677';
// One payment, as Pay Order answers it and as the order view lists it. Both
// carry its id (the order view since console #647), and the cancel takes that,
// never the reference.
const PAYMENT = fixture('travel-order-payment-pending-account').id;
const CANCEL_URL = `/client/v1/travel/order/${ORDER}/payment/${PAYMENT}/cancel`;
const METHODS = [
    {id: 'pm-payid', code: 'PAYID', title: 'PayID', description: null, providers: [{id: 'pp-1', code: 'MONOOVA', title: 'Monoova'}]},
];

const blank = {template: '<div />'};

beforeAll(() => {
    installFakeEcho();
});

afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

const payment = (overrides = {}) => OrderPayment.getInstance({...fixture('travel-order-payment-pending-account'), ...overrides});

const button = (wrapper, label) => wrapper.findAll('button').find(candidate => candidate.text() === label);

/**
 * The order is read more than once on these screens: before the cancel, and
 * again after it. Each read takes the next fixture, and the last one repeats.
 *
 * @param {string[]} orders
 */
function answerOrders(orders) {
    let reads = 0;

    axios.get.mockImplementation((url) => {
        if (String(url).includes('/travel/payment-methods')) {
            return Promise.resolve({status: 200, data: {data: METHODS}});
        }

        if (String(url).includes(`/travel/order/${ORDER}`)) {
            const name = orders[Math.min(reads, orders.length - 1)];
            reads += 1;

            return Promise.resolve(fixtureResponse(name));
        }

        return Promise.reject(new Error(`No route for ${url}`));
    });
}

const cancelAnswers = (name, status = 200) => axios.post.mockImplementation(() => (status >= 400
    ? Promise.reject(fixtureError(name, status))
    : Promise.resolve(fixtureResponse(name, status))));

async function mountAt(component, path) {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            {path: '/travel/booking/:id/pay', name: 'travelBookingPayment', component: blank},
            {path: '/travel/booking/:id/payment', name: 'travelPaymentStatus', component: blank},
            {path: '/travel/booking/:id', name: 'travelBooking', component: blank},
            {path: '/travel/bookings', name: 'travelBookings', component: blank},
        ],
    });

    await router.push(path);
    await router.isReady();

    const push = vi.spyOn(router, 'push');
    const wrapper = mount(component, {
        props: {orderId: ORDER},
        global: {
            plugins: [router],
            stubs: {CustomerLayout: {template: '<div><slot /></div>'}, PaymentCompleted: blank, Failed: blank, Processing: blank, AwaitingPending: blank},
        },
    });

    await flushPromises();

    return {wrapper, push};
}

async function confirmCancel(wrapper) {
    await button(wrapper, 'Cancel this payment').trigger('click');
    await button(wrapper, 'Yes, cancel this payment').trigger('click');
    await flushPromises();
}

describe('the payment a returning customer sees', () => {
    // Every screen but the one straight after paying reads the order view, so
    // the cancel is only reachable if that view names the payment too.
    it('is the same payment, by id, in the order view as in the Pay Order answer', () => {
        expect(fixture('travel-order-view-deposit-pending').payments.at(-1).id).toBe(PAYMENT);
    });
});

describe('which payments can be cancelled', () => {
    it.each(['CREATED', 'INITIALIZED', 'PENDING', 'REDIRECTED'])('%s is still open', (state) => {
        expect(payment({state}).isOpen).toBe(true);
    });

    // AUTHORIZED matters most: the money is held at the provider, and the api
    // refuses to cancel it.
    it.each(['AUTHORIZED', 'CAPTURED', 'FAILED', 'TIMED-OUT', 'CANCELLED', 'REFUNDED', 'PART-REFUNDED'])('%s is not', (state) => {
        expect(payment({state}).isOpen).toBe(false);
    });
});

describe('the cancel action', () => {
    const mountAction = (overrides = {}) => mount(CancelPaymentAction, {props: {orderId: ORDER, payment: payment(overrides)}});

    it('offers nothing for a payment that is no longer open', () => {
        expect(mountAction({state: 'CAPTURED'}).find('button').exists()).toBe(false);
    });

    // The endpoint takes the payment's id, not its reference. Without one the
    // only possible answer is a 404, so nothing is offered.
    it('offers nothing for a payment it has no id for', () => {
        expect(mountAction({id: null}).find('button').exists()).toBe(false);
    });

    it('asks first, with the warning about money already sent, and posts nothing', async () => {
        const wrapper = mountAction();
        await button(wrapper, 'Cancel this payment').trigger('click');

        expect(wrapper.text()).toContain('Cancel this payment?');
        expect(wrapper.text()).toContain("Only do this if you haven't sent the money yet.");
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('lets them keep the payment', async () => {
        const wrapper = mountAction();
        await button(wrapper, 'Cancel this payment').trigger('click');
        await button(wrapper, 'Keep this payment').trigger('click');

        expect(axios.post).not.toHaveBeenCalled();
        expect(button(wrapper, 'Cancel this payment')).toBeTruthy();
    });

    it('cancels by the payment id, and hands back the cancelled payment', async () => {
        cancelAnswers('travel-order-payment-cancelled');
        const wrapper = mountAction();
        await confirmCancel(wrapper);

        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(axios.post).toHaveBeenCalledWith(CANCEL_URL);

        const [cancelled] = wrapper.emitted('cancelled')[0];
        expect(cancelled).toBeInstanceOf(OrderPayment);
        expect(cancelled.state).toBe('CANCELLED');
        expect(cancelled.isOpen).toBe(false);
    });

    it('passes on what the api says when it is too late', async () => {
        cancelAnswers('error-409-cancel-payment-not-open', 409);
        const wrapper = mountAction();
        await confirmCancel(wrapper);

        expect(wrapper.emitted('cancelled')).toBeUndefined();
        expect(wrapper.emitted('refused')[0]).toEqual([fixture('error-409-cancel-payment-not-open').message]);
    });

    it('says so in place, and can be tried again, when the cancel fails any other way', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        axios.post.mockRejectedValue({response: {status: 404, data: {message: 'Not Found'}}});
        const wrapper = mountAction();
        await confirmCancel(wrapper);

        expect(wrapper.emitted('cancelled')).toBeUndefined();
        expect(wrapper.emitted('refused')).toBeUndefined();
        expect(wrapper.text()).toContain('We could not cancel that payment. Please try again.');
        expect(button(wrapper, 'Yes, cancel this payment')).toBeTruthy();
    });
});

describe('the payment screen', () => {
    it('offers the cancel beside a waiting deposit payment, and brings the methods back after it', async () => {
        answerOrders(['travel-order-view-deposit-pending', 'travel-order-view-deposit-failed']);
        cancelAnswers('travel-order-payment-cancelled');
        const {wrapper} = await mountAt(PaymentView, `/travel/booking/${ORDER}/pay`);

        expect(wrapper.find('input[name="payment-method"]').exists()).toBe(false);

        await confirmCancel(wrapper);

        expect(axios.post).toHaveBeenCalledWith(CANCEL_URL);
        expect(wrapper.find('input[name="payment-method"]').exists()).toBe(true);
        expect(wrapper.text()).toContain("That payment is cancelled and your account is free. Choose how you'd like to pay.");
    });

    it('shows the api\'s words when it was too late, and re-reads the order', async () => {
        answerOrders(['travel-order-view-deposit-pending', 'travel-order-view-deposit-failed']);
        cancelAnswers('error-409-cancel-payment-not-open', 409);
        const {wrapper} = await mountAt(PaymentView, `/travel/booking/${ORDER}/pay`);
        await confirmCancel(wrapper);

        expect(wrapper.text()).toContain(fixture('error-409-cancel-payment-not-open').message);
        expect(wrapper.text()).not.toContain('That payment is cancelled');
    });
});

describe('the waiting screen', () => {
    it('sends them to choose a method again once the payment is cancelled', async () => {
        answerOrders(['travel-order-view-deposit-pending']);
        cancelAnswers('travel-order-payment-cancelled');
        const {wrapper, push} = await mountAt(PaymentStatusView, `/travel/booking/${ORDER}/payment`);
        await confirmCancel(wrapper);

        expect(push).toHaveBeenCalledWith({name: 'travelBookingPayment', params: {id: ORDER}});
    });

    // Cancelling after the money has gone is the one case that leaves a deposit
    // unmatched, so it is not offered to somebody who has just said they sent it.
    it('does not offer the cancel to somebody who has said the money is sent', async () => {
        answerOrders(['travel-order-view-deposit-pending']);
        const {wrapper} = await mountAt(PaymentStatusView, `/travel/booking/${ORDER}/payment?sent=1`);

        expect(wrapper.text()).toContain('Waiting for your payment');
        expect(button(wrapper, 'Cancel this payment')).toBeUndefined();
    });

    it('offers it while the deposit account is still being opened', async () => {
        answerOrders(['travel-order-view-deposit-setting-up']);
        const {wrapper} = await mountAt(PaymentStatusView, `/travel/booking/${ORDER}/payment`);

        expect(button(wrapper, 'Cancel this payment')).toBeTruthy();
    });
});

describe('the booking page', () => {
    it('lets a waiting payment go from the list, then takes them to pay another way', async () => {
        answerOrders(['travel-order-view-deposit-pending']);
        cancelAnswers('travel-order-payment-cancelled');
        const {wrapper, push} = await mountAt(ItemView, `/travel/booking/${ORDER}`);
        await confirmCancel(wrapper);

        expect(axios.post).toHaveBeenCalledWith(CANCEL_URL);
        expect(push).toHaveBeenCalledWith({name: 'travelBookingPayment', params: {id: ORDER}});
    });

    it('offers no cancel on a payment that has ended', async () => {
        answerOrders(['travel-order-view-deposit-failed']);
        const {wrapper} = await mountAt(ItemView, `/travel/booking/${ORDER}`);

        expect(button(wrapper, 'Cancel this payment')).toBeUndefined();
    });

    it('shows the api\'s words when it was too late, and re-reads the booking', async () => {
        answerOrders(['travel-order-view-deposit-pending', 'travel-order-view-deposit-failed']);
        cancelAnswers('error-409-cancel-payment-not-open', 409);
        const {wrapper} = await mountAt(ItemView, `/travel/booking/${ORDER}`);
        await confirmCancel(wrapper);

        expect(wrapper.text()).toContain(fixture('error-409-cancel-payment-not-open').message);
        expect(button(wrapper, 'Cancel this payment')).toBeUndefined();
    });
});
