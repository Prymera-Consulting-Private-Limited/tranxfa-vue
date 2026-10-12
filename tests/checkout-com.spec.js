import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {reactive} from "vue";
import axios from "axios";
import CheckoutCom from "@/components/Payment/CheckoutCom.vue";
import PaymentView from "@/views/Transfer/PaymentView.vue";
import {installFakeEcho, makeTransaction, makeTransactionPayload, modalStubs, stateFaceStubs} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn()}}));
vi.mock('@/components/CustomerLayout.vue', () => ({default: {name: 'CustomerLayout', template: '<div><slot /></div>'}}));

// Checkout.com, from the back office's handout (SD-1574): a hosted page, same
// tab, with a payment_url on every PENDING once set up. A declined card stays
// on Checkout.com's page, so FAILED only means a capture the bank refused.

function payload({id = 'pay-1', stateCode = 'PENDING', paymentUrl = null} = {}) {
    const data = makeTransactionPayload({providerCode: 'CHECKOUT-COM', stateCode, paymentUrl});
    data.payment.id = id;
    return data;
}

describe('CheckoutCom', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // The first poll must not overwrite what a test set up by hand.
        axios.get.mockRejectedValue(new Error('no poll in this test'));
        installFakeEcho();
        vi.spyOn(globalThis, 'setInterval').mockReturnValue(1);
        vi.spyOn(globalThis, 'setTimeout').mockReturnValue(2);
    });

    afterEach(() => vi.restoreAllMocks());

    function mountWith(options) {
        const transaction = reactive(makeTransaction({providerCode: 'CHECKOUT-COM', ...options}));
        const wrapper = mount(CheckoutCom, {props: {transaction}, global: {stubs: {...stateFaceStubs}}});
        return {transaction, wrapper};
    }

    it('shows the Pay button, same tab, when PENDING has a URL', () => {
        const {wrapper} = mountWith({stateCode: 'PENDING', paymentUrl: 'https://pay.sandbox.checkout.com/page/hpp_1'});
        const anchor = wrapper.find('a[href="https://pay.sandbox.checkout.com/page/hpp_1"]');
        expect(anchor.exists()).toBe(true);
        expect(anchor.attributes('target')).toBeUndefined();
        expect(wrapper.text()).toContain('Pay AUD 100.00');
        expect(wrapper.text()).toContain("You'll pay on Checkout.com's secure page");
    });

    // Leaving Checkout.com's page unpaid, or coming back with the browser's
    // Back button, finds the same payable page: Pay again, nothing else.
    it('does not mark the payment redirected when Pay is pressed', async () => {
        const {transaction, wrapper} = mountWith({stateCode: 'PENDING', paymentUrl: 'https://pay.sandbox.checkout.com/page/hpp_1'});
        await wrapper.find('a').trigger('click');
        expect(transaction.payment.state.code).toBe('PENDING');
        expect(wrapper.find('a[href="https://pay.sandbox.checkout.com/page/hpp_1"]').exists()).toBe(true);
    });

    it('offers neither "I\'ve made payment" nor a cancel', () => {
        const {wrapper} = mountWith({stateCode: 'PENDING', paymentUrl: 'https://pay.sandbox.checkout.com/page/hpp_1'});
        expect(wrapper.text()).not.toContain("I've made payment");
        expect(wrapper.text()).not.toMatch(/cancel/i);
        expect(wrapper.findAll('button')).toHaveLength(0);
    });

    // There is no awaiting-confirmation shape for this provider: PENDING with
    // no URL is the page still being set up.
    it('shows the setting-up face, not a confirming one, when PENDING has no URL', () => {
        const {wrapper} = mountWith({stateCode: 'PENDING'});
        expect(wrapper.text()).toContain('setting up the payment');
        expect(wrapper.text()).not.toContain('confirming your payment');
        expect(wrapper.find('a[href]').exists()).toBe(false);
    });

    it('shows the stuck notice after a minute without a URL', async () => {
        vi.restoreAllMocks();
        vi.useFakeTimers();
        axios.get.mockResolvedValue({data: payload({stateCode: 'PENDING'})});
        const {wrapper} = mountWith({stateCode: 'PENDING'});
        await flushPromises();
        await vi.advanceTimersByTimeAsync(61_000);
        await flushPromises();
        expect(wrapper.text()).toContain('taking longer than usual');
        vi.useRealTimers();
    });

    it('shows the received face once a poll finds it CAPTURED, then goes to the transfer', async () => {
        axios.get.mockResolvedValue({data: payload({stateCode: 'CAPTURED'})});
        const {wrapper} = mountWith({stateCode: 'PENDING'});
        await flushPromises();
        expect(wrapper.text()).toContain('Payment received');
        expect(globalThis.setTimeout).toHaveBeenCalledWith(expect.any(Function), 1500);
    });

    it('uses its own wording on a failure, without the billing-address advice, and offers a retry', async () => {
        const {wrapper} = mountWith({stateCode: 'FAILED'});
        expect(wrapper.text()).toContain('Payment failed');
        expect(wrapper.text()).toContain("We couldn't take your payment");
        expect(wrapper.text()).not.toContain('billing address');
        await wrapper.find('button').trigger('click');
        expect(wrapper.emitted('retryPayment')).toHaveLength(1);
    });

    it('shows the cancelled face when the expiry sweep cancels it', () => {
        const {wrapper} = mountWith({stateCode: 'CANCELLED'});
        expect(wrapper.text()).toContain('This payment was cancelled');
        expect(wrapper.text()).toContain('No money has moved');
    });

    it('shows the refunded face after an operator refund', () => {
        expect(mountWith({stateCode: 'REFUNDED'}).wrapper.text()).toContain('Payment refunded');
        expect(mountWith({stateCode: 'PART-REFUNDED'}).wrapper.text()).toContain('Payment refunded');
    });
});

describe('PaymentView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        installFakeEcho();
    });

    it('dispatches CHECKOUT-COM to the Checkout.com component', async () => {
        axios.get.mockResolvedValue({data: payload({paymentUrl: 'https://pay.sandbox.checkout.com/page/hpp_1'})});
        const wrapper = mount(PaymentView, {props: {id: 'trx-1'}, global: {stubs: {...modalStubs, CheckoutCom: true}}});
        await flushPromises();
        expect(wrapper.findComponent({name: 'CheckoutCom'}).exists()).toBe(true);
        expect(wrapper.text()).not.toContain("isn't available in the app yet");
    });

    // The retry answers with the new payment before its page exists. The
    // component is remounted for the new payment id and asks until the URL
    // arrives, then shows Pay for the new page.
    it('after a failure, retries and waits for the new payment page', async () => {
        // The view's load, then the failed payment's own first read; after the
        // retry, the new payment's reads.
        axios.get
            .mockResolvedValueOnce({data: payload({stateCode: 'FAILED'})})
            .mockResolvedValueOnce({data: payload({stateCode: 'FAILED'})})
            .mockResolvedValue({data: payload({id: 'pay-2', paymentUrl: 'https://pay.sandbox.checkout.com/page/hpp_2'})});
        axios.post.mockResolvedValue({data: payload({id: 'pay-2'}).payment});

        const wrapper = mount(PaymentView, {props: {id: 'trx-1'}, global: {stubs: {...modalStubs, ...stateFaceStubs}}});
        await flushPromises();
        expect(wrapper.text()).toContain('Payment failed');

        const retry = wrapper.findAll('button').find(b => b.text().includes('Try the payment again'));
        await retry.trigger('click');
        await flushPromises();

        expect(axios.post).toHaveBeenCalledWith('/client/v1/transaction/payment/trx-1', null);
        expect(wrapper.find('a[href="https://pay.sandbox.checkout.com/page/hpp_2"]').exists()).toBe(true);
        expect(wrapper.text()).not.toContain("isn't available in the app yet");
    });
});
