import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import {createPinia, setActivePinia} from "pinia";
import {flushPromises, mount} from "@vue/test-utils";
import {createMemoryHistory, createRouter} from "vue-router";
import {fixture, fixtureError, fixtureResponse} from "./fixtures.js";
import {installFakeEcho} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));

// SD-1269. "Another payment is holding your account. Please pay it or cancel
// it" is no use to somebody who cannot find "it": the payment in the way may
// be a hotel booking, a transfer or a wallet top-up, made days ago. The console
// now names it (SD-1261): held_by on every account_held or same_amount refusal,
// and open_payment on every row of the bookings list.
//
// The hotel refusal and the bookings list are captured from Payvel staging; the
// transfer and wallet refusals are written from the backend's code on develop -
// see tests/fixtures/README.md.
setActivePinia(createPinia());

const axios = (await import('axios')).default;
const {default: DepositHolder} = await import('@/models/deposit_holder.js');
const {default: Order} = await import('@/models/travel/orders/order.js');
const {safeReturnTo} = await import('@/composables/return_to.js');
const {default: HeldByAction} = await import('@/components/Payment/HeldByAction.vue');
const {default: BookingCard} = await import('@/views/Travel/Bookings/Partials/BookingCard.vue');
const {default: BookingPayments} = await import('@/views/Travel/Bookings/Partials/BookingPayments.vue');
const {default: PaymentView} = await import('@/views/Travel/Bookings/PaymentView.vue');
const {default: ItemView} = await import('@/views/Travel/Bookings/ItemView.vue');

// The booking whose payment held the account on Payvel staging, captured
// 2026-09-19: it is the holder in the refusal and the order the cancel is on.
const ORDER = '01a0a76b-3e9f-72db-98b0-89f04386670b';
const METHODS = [
    {id: 'pm-payid', code: 'PAYID', title: 'PayID', description: null, providers: [{id: 'pp-1', code: 'MONOOVA', title: 'Monoova'}]},
];

const blank = {template: '<div />'};

const ROUTES = [
    {path: '/travel/booking/:id/pay', name: 'travelBookingPayment', component: blank},
    {path: '/travel/booking/:id/payment', name: 'travelPaymentStatus', component: blank},
    {path: '/travel/booking/:id', name: 'travelBooking', component: blank},
    {path: '/travel/bookings', name: 'travelBookings', component: blank},
    {path: '/transaction/:transactionId', name: 'viewTransaction', component: blank},
    {path: '/wallet', name: 'wallet', component: blank},
    {path: '/transfer/:quoteId', name: 'transfer', component: blank},
];

beforeAll(() => {
    installFakeEcho();
});

afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

const holderOf = name => DepositHolder.getInstance(fixture(name).held_by);

async function routerAt(path, routes = ROUTES) {
    const router = createRouter({history: createMemoryHistory(), routes});
    await router.push(path);
    await router.isReady();

    return router;
}

async function mountAction(holder, {path = '/transfer/quote-1', routes = ROUTES} = {}) {
    const router = await routerAt(path, routes);

    return mount(HeldByAction, {props: {holder}, global: {plugins: [router]}});
}

describe('what is holding the account', () => {
    it('reads the holder the same way from all three refusals', () => {
        const order = holderOf('error-409-pay-order-account-held-by-order');
        expect(order).toBeInstanceOf(DepositHolder);
        expect(order.kind).toBe('service_order');
        expect(order.id).toBe(ORDER);
        expect(order.reference).toBe('VO-01M2KPPFMZH9Z51HHBRKAE41DE');
        expect(order.paymentId).toBe('01a0b6a0-7dd0-71cd-bab0-d81a26ef6b1e');
        expect(order.service).toBe('HOTELS');

        const transfer = holderOf('error-412-checkout-collides-held-by-transfer');
        expect(transfer.kind).toBe('transfer');
        expect(transfer.paymentId).toBeNull();
        expect(transfer.service).toBeNull();

        expect(holderOf('error-412-wallet-topup-collides-held-by-topup').kind).toBe('wallet_topup');
    });

    // Every other refusal, and a console older than SD-1261.
    it('is nothing when the refusal does not say', () => {
        expect(holderOf('error-409-pay-order-account-held')).toBeNull();
        expect(DepositHolder.getInstance(null)).toBeNull();
        expect(DepositHolder.getInstance('service_order')).toBeNull();
        expect(DepositHolder.getInstance({kind: 'transfer'})).toBeNull();
    });
});

describe('the way back', () => {
    it('follows a path inside this app', () => {
        expect(safeReturnTo(`/travel/booking/${ORDER}/pay`)).toBe(`/travel/booking/${ORDER}/pay`);
        expect(safeReturnTo('/transfer/quote-1?step=confirm')).toBe('/transfer/quote-1?step=confirm');
    });

    // It arrives from the address bar, so anything that could leave the app is
    // dropped rather than followed.
    it.each([
        'https://example.test/steal',
        '//example.test/steal',
        '/\\example.test',
        'javascript:alert(1)',
        'travel/bookings',
        '',
        null,
        undefined,
        ['/travel/bookings'],
    ])('drops %j', (value) => {
        expect(safeReturnTo(value)).toBeNull();
    });
});

describe('the button that opens it', () => {
    it('opens the hotel booking, and remembers where the customer was', async () => {
        const wrapper = await mountAction(holderOf('error-409-pay-order-account-held-by-order'), {path: '/transfer/quote-1'});
        const link = wrapper.find('a');

        expect(link.text()).toBe('View your hotel booking');
        expect(link.attributes('href')).toBe(`/travel/booking/${ORDER}?returnTo=/transfer/quote-1`);
        expect(wrapper.text()).toContain('VO-01M2KPPFMZH9Z51HHBRKAE41DE');
    });

    it('opens the transfer', async () => {
        const wrapper = await mountAction(holderOf('error-412-checkout-collides-held-by-transfer'));

        expect(wrapper.find('a').text()).toBe('View your transfer');
        expect(wrapper.find('a').attributes('href')).toBe('/transaction/01a0c3d0-3333-7444-8555-a66677788899');
        expect(wrapper.text()).toContain('TXN2609180042');
    });

    it('opens the wallet, where pending top-ups are listed and can be cancelled', async () => {
        const wrapper = await mountAction(holderOf('error-412-wallet-topup-collides-held-by-topup'));

        expect(wrapper.find('a').text()).toBe('View your wallet top-up');
        expect(wrapper.find('a').attributes('href')).toBe('/wallet');
    });

    it('offers nothing without a holder, so the message stands alone', async () => {
        expect((await mountAction(null)).find('a').exists()).toBe(false);
    });

    it('offers nothing for a kind it does not know', async () => {
        const holder = DepositHolder.getInstance({kind: 'standing_order', id: 'so-1', reference: 'SO-1'});

        expect((await mountAction(holder)).find('a').exists()).toBe(false);
    });

    // There are no flights screens in this app to open.
    it('offers nothing for a flight order', async () => {
        const holder = DepositHolder.getInstance({...fixture('error-409-pay-order-account-held-by-order').held_by, service: 'FLIGHTS'});

        expect((await mountAction(holder)).find('a').exists()).toBe(false);
    });

    // A deployment without the travel licence has no booking route at all.
    it('offers nothing when this deployment has no such screen', async () => {
        const withoutTravel = ROUTES.filter(route => !route.name.startsWith('travel'));
        const wrapper = await mountAction(holderOf('error-409-pay-order-account-held-by-order'), {routes: withoutTravel});

        expect(wrapper.find('a').exists()).toBe(false);
    });
});

describe('paying for a booking while another payment holds the account', () => {
    async function refusedWith(name) {
        axios.get.mockImplementation((url) => (String(url).includes('/travel/payment-methods')
            ? Promise.resolve({status: 200, data: {data: METHODS}})
            : Promise.resolve(fixtureResponse('travel-order-view-deposit-failed'))));
        axios.post.mockRejectedValue(fixtureError(name, 409));

        const router = await routerAt(`/travel/booking/${ORDER}/pay`);
        const wrapper = mount(PaymentView, {
            props: {orderId: ORDER},
            global: {plugins: [router], stubs: {CustomerLayout: {template: '<div><slot /></div>'}}},
        });
        await flushPromises();

        await wrapper.find('input[name="payment-method"]').setValue(true);
        await wrapper.findAll('button').find(candidate => candidate.text().startsWith('Pay ')).trigger('click');
        await flushPromises();

        return wrapper;
    }

    it('shows the message as sent, and one button to the booking in the way', async () => {
        const wrapper = await refusedWith('error-409-pay-order-account-held-by-order');

        expect(wrapper.text()).toContain(fixture('error-409-pay-order-account-held-by-order').message);
        expect(wrapper.text()).not.toMatch(/hour/i);

        const link = wrapper.findAll('a').find(candidate => candidate.text() === 'View your hotel booking');
        expect(link.attributes('href')).toBe(`/travel/booking/${ORDER}?returnTo=/travel/booking/${ORDER}/pay`);
    });

    it('shows the message alone when the refusal does not name a holder', async () => {
        const wrapper = await refusedWith('error-409-pay-order-account-held');

        expect(wrapper.text()).toContain(fixture('error-409-pay-order-account-held').message);
        expect(wrapper.findAll('a').some(candidate => candidate.text().startsWith('View your'))).toBe(false);
    });
});

describe('coming back after cancelling the payment in the way', () => {
    async function bookingPage(path) {
        axios.get.mockResolvedValue(fixtureResponse('travel-order-view-deposit-pending'));

        const router = await routerAt(path);
        const push = vi.spyOn(router, 'push');
        const wrapper = mount(ItemView, {
            props: {orderId: ORDER},
            global: {plugins: [router], stubs: {CustomerLayout: {template: '<div><slot /></div>'}}},
        });
        await flushPromises();

        return {wrapper, push};
    }

    it('returns them to the payment they were making', async () => {
        const {wrapper, push} = await bookingPage(`/travel/booking/${ORDER}?returnTo=/transfer/quote-1`);
        wrapper.findComponent(BookingPayments).vm.$emit('paymentCancelled');

        expect(push).toHaveBeenCalledWith('/transfer/quote-1');
    });

    it('takes them to pay for this booking when they came from nowhere', async () => {
        const {wrapper, push} = await bookingPage(`/travel/booking/${ORDER}`);
        wrapper.findComponent(BookingPayments).vm.$emit('paymentCancelled');

        expect(push).toHaveBeenCalledWith({name: 'travelBookingPayment', params: {id: ORDER}});
    });

    it('never follows a way back that leaves the app', async () => {
        const {wrapper, push} = await bookingPage(`/travel/booking/${ORDER}?returnTo=https://example.test/steal`);
        wrapper.findComponent(BookingPayments).vm.$emit('paymentCancelled');

        expect(push).toHaveBeenCalledWith({name: 'travelBookingPayment', params: {id: ORDER}});
    });
});

describe('the bookings list', () => {
    // The captured list: five bookings, one of them with a payment waiting.
    const waitingRow = () => fixture('travel-orders-open-payment').data.find(row => row.open_payment);
    const rows = () => {
        const data = fixture('travel-orders-open-payment').data;

        return [data.find(row => row.open_payment), data.find(row => !row.open_payment)].map(row => Order.getInstance(row));
    };

    it('reads the payment still waiting on a booking, with the id the cancel takes', () => {
        const [waiting, settled] = rows();

        expect(waiting.openPayment.id).toBe('01a0b6a0-7dd0-71cd-bab0-d81a26ef6b1e');
        expect(waiting.openPayment.isOpen).toBe(true);
        expect(waiting.openPayment.method).toBe('Bank Transfer');
        expect(waiting.openPayment.amount.currencyPrefixed).toBe('AUD 151.81');
        expect(settled.openPayment).toBeNull();
        expect(fixture('travel-orders-open-payment').data.filter(row => row.open_payment)).toHaveLength(1);
    });

    it('reads a console older than SD-1261, which sends no such key, as nothing waiting', () => {
        const {open_payment: omitted, ...row} = waitingRow();

        expect(omitted).toBeTruthy();
        expect(Order.getInstance(row).openPayment).toBeNull();
    });

    it('marks the booking whose payment is waiting, and no other', async () => {
        const router = await routerAt('/travel/bookings');
        const [waiting, settled] = rows().map(order => mount(BookingCard, {props: {order}, global: {plugins: [router]}}));

        expect(waiting.text()).toContain('Payment waiting: AUD 151.81');
        expect(waiting.text()).toContain('pay by');
        expect(settled.text()).not.toContain('Payment waiting');
    });
});
