import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {nextTick, reactive} from "vue";
import axios from "axios";
import router from "@/router/index.js";
import ManualPayment from "@/components/Payment/ManualPayment.vue";
import Monoova from "@/components/Payment/Monoova.vue";
import PagaPayment from "@/components/Payment/PagaPayment.vue";
import Apaylo from "@/components/Payment/Apaylo.vue";
import WalletPayment from "@/components/Payment/Wallet.vue";
import {installFakeEcho, makeTransaction, makeTransactionPayload, stateFaceStubs} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn()}}));

const stubs = {...stateFaceStubs, ClientPaymentAccount: true, UseClipboard: true};

const account = {id: 'cpa-1', instruction: 'Transfer to the account below.', paymentReference: 'REF-1', attributes: []};

const accountPayload = {
    id: 'cpa-1',
    institution_name: 'Test Bank',
    instruction_text: 'Transfer to the account below.',
    payment_reference: 'REF-1',
    wait_time_message: '',
    attributes: [],
};

function pendingPayload(providerCode) {
    const p = makeTransactionPayload({stateCode: 'PENDING', providerCode});
    p.payment.client_payment_account = accountPayload;
    return p;
}

function mountProvider(component, providerCode, extra = {}) {
    const transaction = reactive(makeTransaction({stateCode: 'PENDING', providerCode, clientPaymentAccount: account, ...extra}));
    const wrapper = mount(component, {props: {transaction}, global: {stubs}});
    return {wrapper, transaction};
}

const paidButton = wrapper => wrapper.findAll('button').find(b => /made payment/i.test(b.text()));

// The refactor that introduced usePaymentWatch removed the transactionUtils
// import from these components and left the click handler calling it. No test
// clicked the button, so "I've made payment" threw a ReferenceError on staging
// for a day. These tests click it.
describe.each([
    ['ManualPayment', ManualPayment, 'MANUAL-PAYMENT'],
    ['Monoova', Monoova, 'MONOOVA'],
    ['PagaPayment', PagaPayment, 'PAGA'],
])('%s: "I\'ve made payment"', (name, component, providerCode) => {
    beforeEach(() => {
        vi.clearAllMocks();
        installFakeEcho();
        axios.get.mockResolvedValue({data: pendingPayload(providerCode)});
    });

    afterEach(() => vi.useRealTimers());

    it('tells the server and moves to the waiting state', async () => {
        vi.useFakeTimers();
        axios.post.mockResolvedValue({data: {}});
        const {wrapper, transaction} = mountProvider(component, providerCode);
        await flushPromises();

        const button = paidButton(wrapper);
        expect(button, 'the button is not rendered').toBeTruthy();
        await button.trigger('click');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith('/client/v1/transaction/payment-sent/pay-1');
        expect(transaction.payment.customerConfirmedPayment).toBe(true);
        expect(transaction.payment.state.code).toBe('REDIRECTED');

        await vi.advanceTimersByTimeAsync(3000);
        expect(router.push).toHaveBeenCalledWith({name: 'viewTransaction', params: {transactionId: 'trx-1'}});
    });

    it('puts the button back when the server could not be told', async () => {
        axios.post.mockRejectedValue(Object.assign(new Error('down'), {response: {status: 500, data: {}}}));
        const {wrapper, transaction} = mountProvider(component, providerCode);
        await flushPromises();

        await paidButton(wrapper).trigger('click');
        await flushPromises();

        expect(transaction.payment.state.code).toBe('PENDING');
        expect(transaction.payment.customerConfirmedPayment).toBe(false);
        expect(paidButton(wrapper), 'no way to try again').toBeTruthy();
        expect(router.push).not.toHaveBeenCalled();
    });

    it('sends once when clicked twice', async () => {
        let resolve;
        axios.post.mockReturnValue(new Promise(r => { resolve = r; }));
        const {wrapper} = mountProvider(component, providerCode);
        await flushPromises();

        const button = paidButton(wrapper);
        await button.trigger('click');
        await button.trigger('click');
        resolve({data: {}});
        await flushPromises();

        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it('does not redirect after the modal is gone', async () => {
        vi.useFakeTimers();
        axios.post.mockResolvedValue({data: {}});
        const {wrapper} = mountProvider(component, providerCode);
        await flushPromises();
        await paidButton(wrapper).trigger('click');
        await flushPromises();

        wrapper.unmount();
        await vi.advanceTimersByTimeAsync(3000);

        expect(router.push).not.toHaveBeenCalled();
    });
});

describe('Apaylo: "I\'ve made payment"', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        installFakeEcho();
        axios.get.mockReturnValue(new Promise(() => {}));
    });

    // Apaylo shows the button after the customer has been sent to Interac,
    // i.e. in the REDIRECTED state, not while the payment is still pending.
    const redirected = () => mountProvider(Apaylo, 'APAYLO', {stateCode: 'REDIRECTED', paymentUrl: 'https://pay.example/1'});

    it('tells the server, then goes to the transaction', async () => {
        axios.post.mockResolvedValue({data: {}});
        const {wrapper, transaction} = redirected();
        await flushPromises();

        const button = paidButton(wrapper);
        expect(button, 'the button is not rendered').toBeTruthy();
        await button.trigger('click');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith('/client/v1/transaction/payment-sent/pay-1');
        expect(transaction.payment.customerConfirmedPayment).toBe(true);
        expect(router.push).toHaveBeenCalledWith({name: 'viewTransaction', params: {transactionId: 'trx-1'}});
    });

    it('keeps the button when the server could not be told', async () => {
        axios.post.mockRejectedValue(Object.assign(new Error('down'), {response: {status: 500, data: {}}}));
        const {wrapper, transaction} = redirected();
        await flushPromises();

        await paidButton(wrapper).trigger('click');
        await flushPromises();

        expect(transaction.payment.customerConfirmedPayment).toBeFalsy();
        expect(paidButton(wrapper)).toBeTruthy();
        expect(router.push).not.toHaveBeenCalled();
    });
});

// The same refactor left Wallet.vue calling a clearPullInterval() that no
// longer existed, inside the watcher that schedules the post-payment redirect.
describe('Wallet payment', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        installFakeEcho();
        axios.get.mockReturnValue(new Promise(() => {}));
    });

    afterEach(() => vi.useRealTimers());

    function mountWallet(stateCode = 'PENDING') {
        const transaction = reactive(makeTransaction({stateCode, providerCode: 'WALLET'}));
        const wrapper = mount(WalletPayment, {props: {transaction}, global: {stubs}});
        return {wrapper, transaction};
    }

    it('goes to the transaction once the wallet debit is captured', async () => {
        vi.useFakeTimers();
        const {wrapper, transaction} = mountWallet();
        await flushPromises();

        transaction.payment.state.code = 'CAPTURED';
        await nextTick();
        expect(wrapper.text()).toContain('Payment received');

        await vi.advanceTimersByTimeAsync(4000);
        expect(router.push).toHaveBeenCalledWith({name: 'viewTransaction', params: {transactionId: 'trx-1'}});
    });

    it('offers a retry when the debit fails', async () => {
        const {wrapper, transaction} = mountWallet();
        await flushPromises();

        transaction.payment.state.code = 'FAILED';
        await nextTick();

        expect(wrapper.text()).toContain('Payment failed');
        expect(wrapper.findAll('button').some(b => /try the payment again/i.test(b.text()))).toBe(true);
    });

    it('does not redirect after the modal is gone', async () => {
        vi.useFakeTimers();
        const {wrapper, transaction} = mountWallet();
        await flushPromises();
        transaction.payment.state.code = 'CAPTURED';
        await nextTick();

        wrapper.unmount();
        await vi.advanceTimersByTimeAsync(4000);

        expect(router.push).not.toHaveBeenCalled();
    });
});
