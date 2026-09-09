import {beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import axios from "axios";
import PaymentView from "@/views/Transfer/PaymentView.vue";
import router from "@/router/index.js";
import {installFakeEcho, makeTransactionPayload, modalStubs} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn()}}));
vi.mock('@/components/CustomerLayout.vue', () => ({default: {name: 'CustomerLayout', template: '<div><slot /></div>'}}));

const providerStubs = {
    ManualPayment: true,
    PagaPayment: true,
    Monoova: true,
    Volume: true,
    Apaylo: true,
    Pay360: true,
    PayCross: true,
    Fincode: true,
    CinetPay: true,
    WalletPayment: true,
};

function mountView() {
    return mount(PaymentView, {
        props: {id: 'trx-1'},
        global: {stubs: {...modalStubs, ...providerStubs}},
    });
}

describe('PaymentView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        installFakeEcho();
    });

    it('mounts the provider component matching the payment provider code', async () => {
        axios.get.mockResolvedValue({data: makeTransactionPayload({providerCode: 'FINCODE'})});
        const wrapper = mountView();
        await flushPromises();
        expect(wrapper.html()).toContain('fincode-stub');
        expect(wrapper.html()).not.toContain('pay-cross-stub');
    });

    it('shows an error face with a retry when the transaction cannot be loaded', async () => {
        axios.get.mockRejectedValue(Object.assign(new Error('boom'), {response: {status: 500, data: {}}}));
        const wrapper = mountView();
        await flushPromises();
        expect(wrapper.vm.isLoading).toBe(false);
        expect(wrapper.vm.transaction).toBe(null);
        expect(wrapper.text()).toContain("We couldn't load your payment");
        axios.get.mockResolvedValue({data: makeTransactionPayload({providerCode: 'FINCODE'})});
        await wrapper.find('button').trigger('click');
        await flushPromises();
        expect(wrapper.html()).toContain('fincode-stub');
    });

    it('does not send a retry past the attempt cap', async () => {
        axios.get.mockResolvedValue({data: makeTransactionPayload({providerCode: 'FINCODE'})});
        const wrapper = mountView();
        await flushPromises();
        wrapper.vm.paymentAttempt = 3;
        await wrapper.vm.retryPayment();
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('replaces the payment on retry and counts the attempt', async () => {
        axios.get.mockResolvedValue({data: makeTransactionPayload({providerCode: 'FINCODE'})});
        axios.post.mockResolvedValue({data: makeTransactionPayload({providerCode: 'FINCODE'}).payment});
        const wrapper = mountView();
        await flushPromises();
        await wrapper.vm.retryPayment();
        await flushPromises();
        expect(axios.post).toHaveBeenCalledWith('/client/v1/transaction/payment/trx-1', null);
        expect(wrapper.vm.paymentAttempt).toBe(2);
    });

    // The back office answered the handout: a retry now returns the whole new
    // payment, but payment_url is always null on that response for hosted
    // providers - the provider call runs on a queue after the answer. The page
    // must therefore watch the NEW payment (its channel, its polling), which it
    // only does if the provider component mounts afresh for the new id.
    it('mounts the provider afresh for the new payment after a retry', async () => {
        axios.get.mockResolvedValue({data: makeTransactionPayload({providerCode: 'FINCODE', paymentUrl: 'https://pay/1'})});
        const wrapper = mountView();
        await flushPromises();
        const before = wrapper.findComponent({name: 'Fincode'}).vm.$.uid;

        const fresh = makeTransactionPayload({providerCode: 'FINCODE'}).payment;
        fresh.id = 'pay-2';
        fresh.payment_url = null;
        axios.post.mockResolvedValue({data: fresh});
        await wrapper.vm.retryPayment();
        await flushPromises();

        const after = wrapper.findComponent({name: 'Fincode'}).vm.$.uid;
        expect(after).not.toBe(before);
        expect(wrapper.vm.transaction.payment.id).toBe('pay-2');
    });

    // Five back-office adapters have no component here. A code with no
    // component rendered nothing at all, which is hard to notice and worse
    // to explain.
    it('says so when the provider has no screen in this app', async () => {
        axios.get.mockResolvedValue({data: makeTransactionPayload({providerCode: 'BELMONEY-CARD'})});
        const wrapper = mountView();
        await flushPromises();

        expect(wrapper.text()).toContain("This way to pay isn't available in the app yet");
        expect(wrapper.text()).toContain('Nothing has been charged');
        expect(wrapper.text()).toContain('#1001');
    });

    it('routes back to the transaction once the attempt cap is exceeded', async () => {
        vi.useFakeTimers();
        axios.get.mockResolvedValue({data: makeTransactionPayload({providerCode: 'FINCODE'})});
        const wrapper = mountView();
        await flushPromises();
        wrapper.vm.paymentAttempt = 4;
        await flushPromises();
        expect(wrapper.text()).toContain("We've paused this transfer");
        await vi.advanceTimersByTimeAsync(8000);
        expect(router.push).toHaveBeenCalledWith({name: 'viewTransaction', params: {transactionId: 'trx-1'}});
        vi.useRealTimers();
    });
});
