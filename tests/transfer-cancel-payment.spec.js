import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {fixture, fixtureError} from "./fixtures.js";
import {installFakeEcho, makeTransactionPayload, modalStubs, stateFaceStubs} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn(), replace: vi.fn(), currentRoute: {value: {query: {}}}}}));
vi.mock('@/components/CustomerLayout.vue', () => ({default: {name: 'CustomerLayout', template: '<div><slot /></div>'}}));

// SD-1423. A bank transfer or PayID payment holds the customer's deposit account
// until it is paid or cancelled, and every other payment into that account is
// refused meanwhile. The console now lets the customer cancel a transfer's
// waiting payment and pay for the transfer again (SD-1418); the app offered
// neither, so an abandoned transfer blocked the customer for up to 30 hours.
const axios = (await import('axios')).default;
const {default: Transaction} = await import('@/models/transaction.js');
const {default: CancelTransferPayment} = await import('@/components/Payment/CancelTransferPayment.vue');
const {default: PaymentView} = await import('@/views/Transfer/PaymentView.vue');
const {default: ItemView} = await import('@/views/Transaction/ItemView.vue');
const {default: Monoova} = await import('@/components/Payment/Monoova.vue');
const {default: ManualPayment} = await import('@/components/Payment/ManualPayment.vue');

const TRANSFER = fixture('transaction-detail-payment-pending-account').id;
const CANCEL_URL = `/client/v1/transaction/payment/${TRANSFER}/cancel`;

beforeEach(() => {
    installFakeEcho();
});

afterEach(() => {
    vi.clearAllMocks();
});

const button = (wrapper, label) => wrapper.findAll('button').find(candidate => candidate.text() === label);

/**
 * The transfer captured on Payvel staging with its Monoova payment waiting and
 * its account details present, with its states replaced where a test needs
 * another row of the handout's table.
 */
function transferPayload({payment = 'PENDING', confirmed = false, state = 'PENDING-PAYMENT', provider = 'MONOOVA'} = {}) {
    const data = fixture('transaction-detail-payment-pending-account');
    data.state.code = state;
    data.payment.state.code = payment;
    data.payment.customer_confirmed_payment = confirmed;
    data.payment.payment_provider.code = provider;

    return data;
}

/** The cancel's 200, as captured: the payment, CANCELLED, account details still on it. */
function cancelledPayment() {
    return fixture('transaction-payment-cancelled');
}

describe('CancelTransferPayment', () => {
    const mountAction = (overrides = {}) => mount(CancelTransferPayment, {
        props: {transaction: Transaction.getInstance(transferPayload(overrides))},
    });

    it('renders nothing once the customer has said they paid', () => {
        expect(mountAction({confirmed: true}).text()).toBe('');
    });

    it('asks before cancelling, and says not to if the money is already sent', async () => {
        const wrapper = mountAction();

        await button(wrapper, 'Cancel payment').trigger('click');

        expect(axios.post).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain('Cancel this payment?');
        expect(wrapper.text()).toContain("Your transfer stays saved and you can pay for it later. Don't cancel if you've already sent the money.");

        await button(wrapper, 'Keep this payment').trigger('click');

        expect(wrapper.text()).not.toContain('Cancel this payment?');
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('cancels the transfer\'s payment and hands the cancelled payment up', async () => {
        axios.post.mockResolvedValue({status: 200, data: cancelledPayment()});
        const wrapper = mountAction();

        await button(wrapper, 'Cancel payment').trigger('click');
        await button(wrapper, 'Yes, cancel payment').trigger('click');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith(CANCEL_URL);
        const [payment] = wrapper.emitted('cancelled')[0];
        expect(payment.state.code).toBe('CANCELLED');
        expect(wrapper.emitted('refused')).toBeUndefined();
    });

    it('hands the api\'s message up when it is too late to cancel', async () => {
        const refusal = fixtureError('error-409-transfer-cancel-payment-not-open', 409);
        axios.post.mockRejectedValue(refusal);
        const wrapper = mountAction();

        await button(wrapper, 'Cancel payment').trigger('click');
        await button(wrapper, 'Yes, cancel payment').trigger('click');
        await flushPromises();

        expect(wrapper.emitted('refused')[0]).toEqual([refusal.response.data.message]);
        expect(wrapper.emitted('cancelled')).toBeUndefined();
    });

    // SD-1422: a gateway that cannot withdraw a payment is refused the same way.
    it('treats a gateway that cannot withdraw the payment as a refusal too', async () => {
        axios.post.mockRejectedValue({response: {status: 409, data: {type: 'payment_not_cancellable', message: 'This payment cannot be cancelled.'}}});
        const wrapper = mountAction();

        await button(wrapper, 'Cancel payment').trigger('click');
        await button(wrapper, 'Yes, cancel payment').trigger('click');
        await flushPromises();

        expect(wrapper.emitted('refused')[0]).toEqual(['This payment cannot be cancelled.']);
    });

    it('keeps the payment and says so when the cancel fails for any other reason', async () => {
        axios.post.mockRejectedValue({response: {status: 404, data: {message: 'Not Found'}}});
        const wrapper = mountAction();

        await button(wrapper, 'Cancel payment').trigger('click');
        await button(wrapper, 'Yes, cancel payment').trigger('click');
        await flushPromises();

        expect(wrapper.text()).toContain('We could not cancel the payment. Please try again.');
        expect(wrapper.text()).not.toContain('Not Found');
        expect(wrapper.emitted('cancelled')).toBeUndefined();
        expect(wrapper.emitted('refused')).toBeUndefined();
    });
});

describe('the bank details screens', () => {
    const stubs = {...stateFaceStubs, ClientPaymentAccount: true, UseClipboard: true, RouterLink: {template: '<a><slot /></a>'}};

    it.each([['MONOOVA', Monoova], ['MANUAL-PAYMENT', ManualPayment]])('%s offers Cancel payment under the bank details and passes the outcome up', async (provider, component) => {
        const wrapper = mount(component, {props: {transaction: Transaction.getInstance(transferPayload({provider}))}, global: {stubs}});
        const cancelled = Transaction.getInstance({...transferPayload(), payment: cancelledPayment()}).payment;

        expect(button(wrapper, 'Cancel payment')).toBeDefined();

        wrapper.findComponent(CancelTransferPayment).vm.$emit('cancelled', cancelled);
        wrapper.findComponent(CancelTransferPayment).vm.$emit('refused', 'Too late.');

        expect(wrapper.emitted('paymentCancelled')[0]).toEqual([cancelled]);
        expect(wrapper.emitted('cancelRefused')[0]).toEqual(['Too late.']);
    });

    it.each([['MONOOVA', Monoova], ['MANUAL-PAYMENT', ManualPayment]])('%s says a cancelled payment can be paid again, not started again', async (provider, component) => {
        const open = mount(component, {props: {transaction: Transaction.getInstance(transferPayload({provider, payment: 'CANCELLED'}))}, global: {stubs}});
        const closed = mount(component, {props: {transaction: Transaction.getInstance(transferPayload({provider, payment: 'CANCELLED', state: 'CANCELLED'}))}, global: {stubs}});

        expect(open.text()).toContain('you can pay for it again');
        expect(closed.text()).toContain('You can start the transfer again');
    });
});

describe('the payment screen', () => {
    const providerStubs = {ManualPayment: true, PagaPayment: true, Monoova: true, Volume: true, Apaylo: true, Pay360: true, PayCross: true, Fincode: true, CinetPay: true, BelmoneyCard: true, WalletPayment: true};

    async function mountView(payload) {
        axios.get.mockResolvedValue({data: payload});
        const wrapper = mount(PaymentView, {props: {id: payload.id}, global: {stubs: {...modalStubs, ...providerStubs}}});
        await flushPromises();

        return wrapper;
    }

    it('shows the cancelled payment and offers Pay again once it is cancelled', async () => {
        const wrapper = await mountView(transferPayload());

        expect(button(wrapper, 'Pay again')).toBeUndefined();

        wrapper.findComponent({name: 'Monoova'}).vm.$emit('paymentCancelled', Transaction.getInstance({...transferPayload(), payment: cancelledPayment()}).payment);
        await flushPromises();

        expect(wrapper.vm.transaction.payment.state.code).toBe('CANCELLED');
        expect(button(wrapper, 'Pay again')).toBeDefined();
    });

    it.each(['CANCELLED', 'TIMED-OUT'])('offers Pay again on a %s payment, which no provider screen does', async (payment) => {
        const wrapper = await mountView(transferPayload({payment, provider: 'PAY360'}));

        expect(button(wrapper, 'Pay again')).toBeDefined();
    });

    it('leaves a failed payment to the provider screen\'s own retry, where it has one', async () => {
        expect(button(await mountView(transferPayload({payment: 'FAILED', provider: 'MONOOVA'})), 'Pay again')).toBeUndefined();
        expect(button(await mountView(transferPayload({payment: 'FAILED', provider: 'MANUAL-PAYMENT'})), 'Pay again')).toBeDefined();
    });

    it('offers nothing on a transfer the platform has closed', async () => {
        const wrapper = await mountView(transferPayload({payment: 'CANCELLED', state: 'CANCELLED'}));

        expect(button(wrapper, 'Pay again')).toBeUndefined();
    });

    // Both captured on the same transfer: the cancelled payment, then Pay again's
    // answer, a new payment with its own id.
    it('opens a new payment on the same transfer when Pay again is pressed', async () => {
        const wrapper = await mountView(fixture('transaction-detail-payment-cancelled'));
        const payAgain = fixture('payment-retry-after-cancel');
        axios.post.mockResolvedValue({data: payAgain});

        expect(wrapper.vm.transaction.payment.id).not.toBe(payAgain.id);

        await button(wrapper, 'Pay again').trigger('click');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith(`/client/v1/transaction/payment/${TRANSFER}`, null);
        expect(wrapper.vm.transaction.payment.id).toBe(payAgain.id);
        expect(wrapper.vm.transaction.payment.state.code).toBe('CREATED');
    });

    // Ruled 27 Sep: a payment the customer cancelled is not a try that went wrong.
    it('never counts paying again after a cancel towards the three tries', async () => {
        const wrapper = await mountView(fixture('transaction-detail-payment-cancelled'));
        wrapper.vm.paymentAttempt = 3;
        axios.post.mockResolvedValue({data: fixture('payment-retry-after-cancel')});

        await wrapper.vm.retryPayment();
        await flushPromises();

        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(wrapper.vm.paymentAttempt).toBe(3);
        expect(wrapper.vm.retryLimitReached).toBe(false);
    });

    it('still counts a retry after a failure', async () => {
        const wrapper = await mountView(makeTransactionPayload({stateCode: 'FAILED', providerCode: 'MONOOVA'}));
        axios.post.mockResolvedValue({data: fixture('payment-retry')});

        await wrapper.vm.retryPayment();
        await flushPromises();

        expect(wrapper.vm.paymentAttempt).toBe(2);
    });

    it('re-reads the transfer and shows the message when the cancel was refused', async () => {
        const wrapper = await mountView(transferPayload());
        axios.get.mockResolvedValue({data: transferPayload({payment: 'REDIRECTED', confirmed: true})});

        wrapper.findComponent({name: 'Monoova'}).vm.$emit('cancelRefused', 'This payment can no longer be cancelled.');
        await flushPromises();

        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(wrapper.vm.transaction.payment.state.code).toBe('REDIRECTED');
        expect(wrapper.vm.retryFailure).toBe('This payment can no longer be cancelled.');
    });

    // A 412 with no type: already paid, or the payment cannot be replaced.
    it('re-reads the transfer when Pay again finds the payment has moved on', async () => {
        const wrapper = await mountView(transferPayload({payment: 'CANCELLED'}));
        axios.post.mockRejectedValue({response: {status: 412, data: {message: 'This transfer has already been paid.'}}});
        axios.get.mockResolvedValue({data: transferPayload({payment: 'CAPTURED', state: 'PAYMENT-CLEARED'})});

        await button(wrapper, 'Pay again').trigger('click');
        await flushPromises();

        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(wrapper.vm.transaction.payment.state.code).toBe('CAPTURED');
        expect(wrapper.vm.retryFailure).toBe('This transfer has already been paid.');
    });

    it('only shows the message for a maintenance window, which changed nothing', async () => {
        const wrapper = await mountView(transferPayload({payment: 'CANCELLED'}));
        axios.post.mockRejectedValue({response: {status: 412, data: {type: 'active_transfer_disable_rule', message: 'Transfers are paused for maintenance.'}}});

        await button(wrapper, 'Pay again').trigger('click');
        await flushPromises();

        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(wrapper.vm.retryFailure).toBe('Transfers are paused for maintenance.');
    });
});

describe('the transfer page', () => {
    const stubs = {...modalStubs, RouterLink: {props: ['to'], template: '<a><slot /></a>'}, Monoova: true, ManualPayment: true, PagaPayment: true};

    async function mountPage(payload) {
        axios.get.mockResolvedValue({data: payload});
        const wrapper = mount(ItemView, {props: {id: payload.id}, global: {stubs}});
        await flushPromises();

        return wrapper;
    }

    it('offers Cancel payment beside the bank details of a waiting payment', async () => {
        const wrapper = await mountPage(transferPayload());

        expect(button(wrapper, 'Cancel payment')).toBeDefined();
    });

    it('offers no Cancel once the customer has said they paid', async () => {
        const wrapper = await mountPage(transferPayload({confirmed: true}));

        expect(button(wrapper, 'Cancel payment')).toBeUndefined();
    });

    it('stops showing the account as somewhere to pay once the payment is cancelled', async () => {
        const wrapper = await mountPage(transferPayload({payment: 'CANCELLED'}));

        expect(wrapper.text()).not.toContain('View');
        expect(wrapper.text()).toContain('Pay again');
        expect(button(wrapper, 'Cancel payment')).toBeUndefined();
    });

    it('says the payment is cancelled and offers Pay again after a cancel', async () => {
        const wrapper = await mountPage(transferPayload());
        axios.post.mockResolvedValue({status: 200, data: cancelledPayment()});

        await button(wrapper, 'Cancel payment').trigger('click');
        await button(wrapper, 'Yes, cancel payment').trigger('click');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith(CANCEL_URL);
        expect(wrapper.text()).toContain('Payment cancelled. No money has moved.');
        expect(wrapper.text()).toContain('Pay again');
        expect(button(wrapper, 'Cancel payment')).toBeUndefined();
    });

    it('re-reads the transfer and shows the api\'s reason when it was too late', async () => {
        const wrapper = await mountPage(transferPayload());
        const refusal = fixtureError('error-409-transfer-cancel-payment-not-open', 409);
        axios.post.mockRejectedValue(refusal);
        axios.get.mockResolvedValue({data: transferPayload({payment: 'REDIRECTED', confirmed: true})});

        await button(wrapper, 'Cancel payment').trigger('click');
        await button(wrapper, 'Yes, cancel payment').trigger('click');
        await flushPromises();

        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(wrapper.text()).toContain(refusal.response.data.message);
        expect(button(wrapper, 'Cancel payment')).toBeUndefined();
    });
});
