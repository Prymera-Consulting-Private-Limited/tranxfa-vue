import {beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import axios from "axios";
import PaymentView from "@/views/Transfer/PaymentView.vue";
import router from "@/router/index.js";
import {installFakeEcho, makeTransactionPayload, modalStubs, withUnhandledRejections} from "./helpers.js";

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

    it('characterizes: a failed transaction fetch opens the modal empty, with no message', async () => {
        axios.get.mockRejectedValue(Object.assign(new Error('boom'), {response: {status: 500, data: {}}}));
        let wrapper;
        const escaped = await withUnhandledRejections(async () => {
            wrapper = mountView();
            await flushPromises();
            await flushPromises();
        });
        expect(wrapper.vm.isLoading).toBe(false);
        expect(wrapper.vm.transaction).toBe(null);
        expect(wrapper.html()).not.toContain('fincode-stub');
        expect(wrapper.text()).not.toMatch(/wrong|failed|try again/i);
        expect(escaped).toHaveLength(1);
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

    it('routes back to the transaction once the attempt cap is exceeded', async () => {
        axios.get.mockResolvedValue({data: makeTransactionPayload({providerCode: 'FINCODE'})});
        const wrapper = mountView();
        await flushPromises();
        wrapper.vm.paymentAttempt = 4;
        await flushPromises();
        expect(router.push).toHaveBeenCalledWith({name: 'viewTransaction', params: {transactionId: 'trx-1'}});
    });
});
