import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import {readdirSync, readFileSync} from "node:fs";
import {createPinia, setActivePinia} from "pinia";
import {flushPromises, mount} from "@vue/test-utils";
import {createMemoryHistory, createRouter} from "vue-router";
import {fixture, fixtureError, fixtureResponse} from "./fixtures.js";
import {installFakeEcho} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));

// SD-1250. A hotel can be paid by PayID or bank transfer into the customer's own
// deposit account. That payment has no redirect: payment_url is null and
// client_payment_account says where to send the money. The payment screen used
// to send every such payment to the waiting screen, which never showed the
// account, so the customer was never told where to pay.
//
// The pending payment and its order view are captured from Payvel staging; the
// setting-up, failed and refusal fixtures are written from the backend's
// handout and the SD-1248 addendum - see tests/fixtures/README.md.
setActivePinia(createPinia());

const axios = (await import('axios')).default;
const {default: PaymentView} = await import('@/views/Travel/Bookings/PaymentView.vue');
const {default: PaymentStatusView} = await import('@/views/Travel/Bookings/PaymentStatusView.vue');
const {default: ItemView} = await import('@/views/Travel/Bookings/ItemView.vue');

const ORDER = '01a0b2c0-1111-7222-8333-944455566677';
const PROVIDER_WORDING = 'Active Reconciliation Rule Exists for PayId';

const METHODS = [
    {id: 'pm-payid', code: 'PAYID', title: 'PayID', description: null, providers: [{id: 'pp-1', code: 'MONOOVA', title: 'Monoova'}]},
    {id: 'pm-bank', code: 'BANK-TRANSFER', title: 'Bank transfer', description: null, providers: [{id: 'pp-1', code: 'MONOOVA', title: 'Monoova'}]},
];

const blank = {template: '<div />'};

// The booking page listens for the hotel's confirmation.
beforeAll(() => {
    installFakeEcho();
});

afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

/**
 * @param {{order: string, pay?: {name: string, status: number}, methods?: Array}} routes
 */
function answer({order, pay = null, methods = METHODS}) {
    axios.get.mockImplementation((url) => {
        if (String(url).includes('/travel/payment-methods')) {
            return Promise.resolve({status: 200, data: {data: methods}});
        }

        if (String(url).includes(`/travel/order/${ORDER}`)) {
            return Promise.resolve(fixtureResponse(order));
        }

        return Promise.reject(new Error(`No route for ${url}`));
    });

    axios.post.mockImplementation(() => (pay.status >= 400
        ? Promise.reject(fixtureError(pay.name, pay.status))
        : Promise.resolve(fixtureResponse(pay.name, pay.status))));
}

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
            // The state animations draw on a canvas, which jsdom does not have.
            stubs: {CustomerLayout: {template: '<div><slot /></div>'}, PaymentCompleted: blank, Failed: blank, Processing: blank, AwaitingPending: blank},
        },
    });

    await flushPromises();

    return {wrapper, push};
}

const payButton = wrapper => wrapper.findAll('button').find(button => button.text().startsWith('Pay '));
const labels = wrapper => wrapper.findAll('label').map(label => label.text());

describe('paying by PayID or bank transfer', () => {
    it('shows where to send the money when Pay Order answers with an account', async () => {
        answer({order: 'travel-order-view-deposit-setting-up', pay: {name: 'travel-order-payment-pending-account', status: 201}});
        // A setting-up payment on the order is not open to act on, so the picker shows.
        const {wrapper, push} = await mountAt(PaymentView, `/travel/booking/${ORDER}/pay`);

        await payButton(wrapper).trigger('click');
        await flushPromises();

        const text = wrapper.text();

        expect(push).not.toHaveBeenCalled();
        expect(text).toContain('please transfer funds to the bank account listed below');
        // In the order the api gave them, and nothing about the rail assumed.
        expect(labels(wrapper)).toEqual(['Account Name', 'BSB', 'Account Number', 'Payment reference']);
        expect(wrapper.find('#payment-reference').element.value).toBe('SP8518335');
        // The amount of the payment, as Pay Order answered it.
        expect(text).toContain('AUD 151.81');
        expect(text).toContain('Pay by');
        expect(text).not.toContain('How would you like to pay?');
    });

    it('renders a bank transfer account from the same code, with its own attributes', async () => {
        answer({order: 'travel-order-view-deposit-pending'});
        const {wrapper} = await mountAt(PaymentView, `/travel/booking/${ORDER}/pay`);

        expect(labels(wrapper)).toEqual(['Account Name', 'BSB', 'Account Number', 'Payment reference']);
        // A customer who comes back is shown the open payment, not a second one.
        expect(wrapper.text()).not.toContain('How would you like to pay?');
    });

    it('moves to the waiting screen when the customer says they have sent it', async () => {
        answer({order: 'travel-order-view-deposit-pending'});
        const {wrapper, push} = await mountAt(PaymentView, `/travel/booking/${ORDER}/pay`);

        await wrapper.findAll('button').find(button => button.text() === "I've made payment").trigger('click');

        expect(push).toHaveBeenCalledWith({name: 'travelPaymentStatus', params: {id: ORDER}, query: {sent: '1'}});
    });

    it('hands a payment still being set up to the screen that polls', async () => {
        answer({order: 'travel-order-view-deposit-setting-up', pay: {name: 'travel-order-payment-created', status: 201}});
        const {wrapper, push} = await mountAt(PaymentView, `/travel/booking/${ORDER}/pay`);

        await payButton(wrapper).trigger('click');
        await flushPromises();

        expect(push).toHaveBeenCalledWith({name: 'travelPaymentStatus', params: {id: ORDER}});
    });
});

describe('the waiting screen', () => {
    it('says the payment is being set up while there is no account yet', async () => {
        answer({order: 'travel-order-view-deposit-setting-up'});
        const {wrapper} = await mountAt(PaymentStatusView, `/travel/booking/${ORDER}/payment`);

        expect(wrapper.text()).toContain('Getting your payment ready');
    });

    it('shows the account once polling finds it pending', async () => {
        answer({order: 'travel-order-view-deposit-pending'});
        const {wrapper} = await mountAt(PaymentStatusView, `/travel/booking/${ORDER}/payment`);

        expect(labels(wrapper)).toEqual(['Account Name', 'BSB', 'Account Number', 'Payment reference']);
    });

    it('tells a customer who has sent the money how long it usually takes', async () => {
        answer({order: 'travel-order-view-deposit-pending'});
        const {wrapper} = await mountAt(PaymentStatusView, `/travel/booking/${ORDER}/payment?sent=1`);

        expect(wrapper.text()).toContain('Waiting for your payment');
        // The provider's own words, from the account's wait_time_message.
        expect(wrapper.text()).toContain('it may take up to 24 hours');
        expect(wrapper.find('#payment-reference').exists()).toBe(false);
    });

    it('says a failed payment in our own words and offers another attempt', async () => {
        answer({order: 'travel-order-view-deposit-failed'});
        const {wrapper} = await mountAt(PaymentStatusView, `/travel/booking/${ORDER}/payment`);

        expect(wrapper.text()).toContain("That payment didn't go through");
        // The room is only booked once a payment arrives (SD-1282), so it is not
        // promised to somebody whose payment has just failed.
        expect(wrapper.text()).toContain("You haven't been charged. You can try paying again.");
        expect(wrapper.text()).not.toContain('still booked');
        expect(wrapper.text()).toContain('Try paying again');
    });
});

describe('the booking page', () => {
    it('repeats where to pay for a payment still waiting on the customer', async () => {
        answer({order: 'travel-order-view-deposit-pending'});
        const {wrapper} = await mountAt(ItemView, `/travel/booking/${ORDER}`);

        expect(labels(wrapper)).toEqual(['Account Name', 'BSB', 'Account Number', 'Payment reference']);
        expect(wrapper.text()).toContain('Pay by');
    });

    it('shows nothing of the sort once the payment has failed', async () => {
        answer({order: 'travel-order-view-deposit-failed'});
        const {wrapper} = await mountAt(ItemView, `/travel/booking/${ORDER}`);

        expect(wrapper.find('#payment-reference').exists()).toBe(false);
    });
});

describe('the provider\'s failure wording never reaches the customer', () => {
    it('is not on the payment screen after Pay Order answers FAILED', async () => {
        answer({order: 'travel-order-view-deposit-setting-up', pay: {name: 'travel-order-payment-failed', status: 201}});
        const {wrapper, push} = await mountAt(PaymentView, `/travel/booking/${ORDER}/pay`);

        await payButton(wrapper).trigger('click');
        await flushPromises();

        expect(wrapper.text()).not.toContain(PROVIDER_WORDING);
        expect(push).toHaveBeenCalledWith({name: 'travelPaymentStatus', params: {id: ORDER}});
    });

    it('is not on the waiting screen, even if an order view ever carried it', async () => {
        const order = fixture('travel-order-view-deposit-failed');
        order.payments[0].failure_reason = fixture('travel-order-payment-failed').failure_reason;
        axios.get.mockImplementation(() => Promise.resolve({status: 200, data: order}));

        const {wrapper} = await mountAt(PaymentStatusView, `/travel/booking/${ORDER}/payment`);

        expect(wrapper.text()).toContain("That payment didn't go through");
        expect(wrapper.text()).not.toContain(PROVIDER_WORDING);
    });

    // A render check only covers the screens it mounts. The rule is that nothing
    // in travel outside the model reads the field at all, so a new screen cannot
    // start showing it without this failing. The transfer flow's payments carry
    // a field of the same name from a different resource, and are not in scope.
    it('is read by nothing in travel but the model that maps it', () => {
        const under = dir => readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
            const path = `${dir}/${entry.name}`;

            return entry.isDirectory() ? under(path) : [path];
        });

        const readers = ['src/views/Travel', 'src/models/travel', 'src/composables/travel']
            .flatMap(under)
            .filter(file => /\.(vue|js)$/.test(file))
            .filter(file => file !== 'src/models/travel/orders/order_payment.js')
            .filter(file => /failureReason|failure_reason/.test(readFileSync(file, 'utf8')));

        expect(readers).toEqual([]);
    });
});

describe('a 409 from Pay Order', () => {
    async function refusedWith(name, order = 'travel-order-view-deposit-setting-up') {
        answer({order, pay: {name, status: 409}});
        const mounted = await mountAt(PaymentView, `/travel/booking/${ORDER}/pay`);

        await payButton(mounted.wrapper).trigger('click');
        await flushPromises();

        return mounted;
    }

    it('shows the message as the api wrote it, whatever the type', async () => {
        const {wrapper} = await refusedWith('error-409-pay-order-account-held');

        expect(wrapper.text()).toContain(fixture('error-409-pay-order-account-held').message);
        // Nothing here can clear a held account, so the choice stays open.
        expect(wrapper.text()).toContain('How would you like to pay?');
    });

    it('keeps the picker for the same amount, since a hotel price cannot change', async () => {
        const {wrapper} = await refusedWith('error-409-pay-order-same-amount');

        expect(wrapper.text()).toContain(fixture('error-409-pay-order-same-amount').message);
        expect(wrapper.text()).toContain('How would you like to pay?');
    });

    it('keeps today\'s behaviour for a 409 with no type', async () => {
        const {wrapper, push} = await refusedWith('error-409-pay-order-untyped');

        expect(wrapper.text()).toContain(fixture('error-409-pay-order-untyped').message);
        expect(wrapper.text()).toContain('How would you like to pay?');
        expect(push).not.toHaveBeenCalled();
    });

    it('stops offering to pay for an order that has ended', async () => {
        const {wrapper} = await refusedWith('error-409-pay-order-order-not-payable');

        expect(wrapper.text()).toContain('This booking can no longer be paid for');
        expect(wrapper.text()).toContain(fixture('error-409-pay-order-order-not-payable').message);
        expect(wrapper.text()).toContain('Status: Confirmed');
        expect(payButton(wrapper)).toBeUndefined();
    });

    it('sends an already paid order to the payment\'s outcome', async () => {
        const {push} = await refusedWith('error-409-pay-order-order-already-paid');

        expect(push).toHaveBeenCalledWith({name: 'travelPaymentStatus', params: {id: ORDER}});
    });

    // Pay is pressed on an order whose payment was still being set up; by the
    // refusal it has moved on, so the re-read answers with the account.
    it('re-reads the order on payment_waiting and shows its account', async () => {
        answer({order: 'travel-order-view-deposit-setting-up', pay: {name: 'error-409-pay-order-payment-waiting', status: 409}});
        const {wrapper} = await mountAt(PaymentView, `/travel/booking/${ORDER}/pay`);

        answer({order: 'travel-order-view-deposit-pending', pay: {name: 'error-409-pay-order-payment-waiting', status: 409}});
        await payButton(wrapper).trigger('click');
        await flushPromises();

        expect(labels(wrapper)).toEqual(['Account Name', 'BSB', 'Account Number', 'Payment reference']);
    });

    it('hands a waiting payment still being set up to the screen that polls', async () => {
        const {push} = await refusedWith('error-409-pay-order-payment-waiting', 'travel-order-view-deposit-setting-up');

        expect(push).toHaveBeenCalledWith({name: 'travelPaymentStatus', params: {id: ORDER}});
    });

    it('fetches the methods again when the chosen one is no longer offered', async () => {
        answer({order: 'travel-order-view-deposit-setting-up', pay: {name: 'error-409-pay-order-method-not-offered', status: 409}});
        const {wrapper} = await mountAt(PaymentView, `/travel/booking/${ORDER}/pay`);
        const calls = () => axios.get.mock.calls.filter(([url]) => String(url).includes('/travel/payment-methods')).length;

        expect(calls()).toBe(1);

        answer({order: 'travel-order-view-deposit-setting-up', pay: {name: 'error-409-pay-order-method-not-offered', status: 409}, methods: [METHODS[1]]});
        await payButton(wrapper).trigger('click');
        await flushPromises();

        expect(calls()).toBe(2);
        expect(wrapper.text()).not.toContain('PayID');
        expect(wrapper.text()).toContain('Bank transfer');
    });

    it.each([
        'error-409-pay-order-method-unavailable',
        'error-409-pay-order-method-settled-by-hand',
    ])('%s moves the choice off the refused method', async (name) => {
        const {wrapper} = await refusedWith(name);

        const radios = wrapper.findAll('input[type="radio"]');

        expect(radios[0].element.disabled).toBe(true);
        expect(radios[1].element.checked).toBe(true);
        expect(wrapper.text()).toContain(fixture(name).message);
    });
});
