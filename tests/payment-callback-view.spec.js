import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import axios from "axios";
import PaymentCallbackView from "@/views/Transfer/PaymentCallbackView.vue";
import router from "@/router/index.js";
import {installFakeEcho, makeTransactionPayload, modalStubs, stateFaceStubs} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn()}}));
vi.mock('@/components/CustomerLayout.vue', () => ({default: {name: 'CustomerLayout', template: '<div><slot /></div>'}}));

function mountView() {
    return mount(PaymentCallbackView, {
        props: {id: 'trx-1'},
        global: {stubs: {...modalStubs, ...stateFaceStubs}},
    });
}

// Characterization: the "characterizes" cases assert the behaviour shipped
// today, defects included. Timers are asserted through spies — scheduled
// callbacks are captured and invoked by hand.
describe('PaymentCallbackView', () => {
    let listeners;
    let setIntervalSpy;
    let setTimeoutSpy;

    beforeEach(() => {
        vi.clearAllMocks();
        listeners = installFakeEcho();
        setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockReturnValue(1);
        setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function scheduledRedirects() {
        return setTimeoutSpy.mock.calls.filter(([, delay]) => delay === 1500);
    }

    it('shows the awaiting face when the returned payment is not final', async () => {
        axios.get.mockResolvedValue({data: makeTransactionPayload({stateCode: 'REDIRECTED'})});
        const wrapper = mountView();
        await flushPromises();
        expect(wrapper.text()).toContain('Awaiting Payment Update');
    });

    it('polls beside the websocket while the result is not final', async () => {
        axios.get.mockResolvedValue({data: makeTransactionPayload({stateCode: 'REDIRECTED'})});
        mountView();
        await flushPromises();
        const polls = setIntervalSpy.mock.calls.filter(([, delay]) => delay === 10000);
        expect(polls).toHaveLength(1);
        polls[0][0]();
        await flushPromises();
        expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it('does not poll when the payment arrives already settled', async () => {
        axios.get.mockResolvedValue({data: makeTransactionPayload({stateCode: 'AUTHORIZED'})});
        mountView();
        await flushPromises();
        expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    it('completes via the websocket event and routes to the transaction', async () => {
        axios.get.mockResolvedValue({data: makeTransactionPayload({stateCode: 'REDIRECTED'})});
        const wrapper = mountView();
        await flushPromises();
        listeners['client-payment.pay-1:PaymentTransactionStateUpdated']({
            state: {id: 'st-2', code: 'AUTHORIZED', color_scheme: 'green'},
            shared_reference: 'REF-2',
        });
        await flushPromises();
        expect(wrapper.text()).toContain('Payment Successful');
        const redirects = scheduledRedirects();
        expect(redirects).toHaveLength(1);
        redirects[0][0]();
        await flushPromises();
        expect(router.push).toHaveBeenCalledWith({name: 'viewTransaction', params: {transactionId: 'trx-1'}});
    });

    it('schedules the redirect once when arriving already settled', async () => {
        axios.get.mockResolvedValue({data: makeTransactionPayload({stateCode: 'AUTHORIZED'})});
        mountView();
        await flushPromises();
        expect(scheduledRedirects()).toHaveLength(1);
    });

    it('shows the expiry face when the payment TIMED_OUT', async () => {
        axios.get.mockResolvedValue({data: makeTransactionPayload({stateCode: 'TIMED-OUT'})});
        const wrapper = mountView();
        await flushPromises();
        expect(wrapper.text()).toContain('This payment has expired');
    });

    it('shows an error face when the transaction cannot be loaded', async () => {
        axios.get.mockRejectedValue(Object.assign(new Error('boom'), {response: {status: 500, data: {}}}));
        const wrapper = mountView();
        await flushPromises();
        expect(wrapper.vm.transaction).toBe(null);
        expect(wrapper.vm.isLoading).toBe(false);
        expect(wrapper.text()).toContain("We couldn't check your payment");
    });
});
