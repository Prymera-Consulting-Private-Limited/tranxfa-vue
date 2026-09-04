import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {reactive} from "vue";
import axios from "axios";
import Fincode from "@/components/Payment/Fincode.vue";
import PayCross from "@/components/Payment/PayCross.vue";
import Pay360 from "@/components/Payment/Pay360.vue";
import router from "@/router/index.js";
import {installFakeEcho, makeTransaction, stateFaceStubs} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn()}}));

// Fincode, PayCross and Pay360 are copies of the same redirect-provider
// component; one suite pins all three.
//
// Characterization: the "characterizes" cases assert the behaviour shipped
// today, defects included, so the fix commit shows exactly which behaviours
// changed and nothing else.
//
// Timers are asserted through spies — the scheduled callbacks are captured
// and invoked by hand, so no clock is involved.
describe.each([
    ['Fincode', Fincode],
    ['PayCross', PayCross],
    ['Pay360', Pay360],
])('%s payment component', (name, component) => {
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

    function mountWith(transactionOptions) {
        const transaction = reactive(makeTransaction(transactionOptions));
        const wrapper = mount(component, {
            props: {transaction},
            global: {stubs: {...stateFaceStubs}},
        });
        return {transaction, wrapper};
    }

    function scheduledPolls() {
        return setIntervalSpy.mock.calls.filter(([, delay]) => delay === 10000);
    }

    it('renders the pay link when the payment is PENDING with a URL', () => {
        const {wrapper} = mountWith({stateCode: 'PENDING', paymentUrl: 'https://pay.example/session'});
        const anchor = wrapper.find('a[href="https://pay.example/session"]');
        expect(anchor.exists()).toBe(true);
        expect(anchor.text()).toContain('Pay AUD 100.00');
    });

    it('shows the waiting face instead of a dead pay link when PENDING has no URL yet', () => {
        const {wrapper} = mountWith({stateCode: 'PENDING', paymentUrl: null});
        expect(wrapper.find('a').exists()).toBe(false);
        expect(wrapper.text()).toContain('Please wait while we are setting up the payment.');
    });

    it('keeps the poll scheduled when mounted at PENDING without a URL', () => {
        mountWith({stateCode: 'PENDING', paymentUrl: null});
        expect(scheduledPolls()).toHaveLength(1);
    });

    it('shows the waiting face and polls while the payment is being set up', async () => {
        axios.get.mockReturnValue(new Promise(() => {}));
        const {wrapper} = mountWith({stateCode: 'CREATED'});
        expect(wrapper.text()).toContain('Please wait while we are setting up the payment.');
        expect(scheduledPolls()).toHaveLength(1);
        scheduledPolls()[0][0]();
        expect(axios.get).toHaveBeenCalledWith('/client/v1/transaction/trx-1');
    });

    it('does not schedule a poll once the payment is PENDING with its URL', () => {
        mountWith({stateCode: 'PENDING', paymentUrl: 'https://pay.example/session'});
        expect(scheduledPolls()).toHaveLength(0);
    });

    it('shows the expiry face when the payment TIMED_OUT', () => {
        const {wrapper} = mountWith({stateCode: 'TIMED_OUT'});
        expect(wrapper.text()).toContain('This payment has expired');
        expect(wrapper.text()).toContain('View Transaction');
    });

    it('shows the cancelled face when the payment is CANCELLED', () => {
        const {wrapper} = mountWith({stateCode: 'CANCELLED'});
        expect(wrapper.text()).toContain('This payment was cancelled');
        expect(wrapper.text()).toContain('View Transaction');
    });

    it('shows the refunded face when the payment is REFUNDED', () => {
        const {wrapper} = mountWith({stateCode: 'REFUNDED'});
        expect(wrapper.text()).toContain('Payment Refunded');
        expect(wrapper.text()).toContain('View Transaction');
    });

    it('does not schedule a poll for a terminal payment', () => {
        mountWith({stateCode: 'TIMED_OUT'});
        expect(scheduledPolls()).toHaveLength(0);
    });

    it('routes to the transaction after an AUTHORIZED websocket event', async () => {
        const {wrapper} = mountWith({stateCode: 'REDIRECTED'});
        expect(wrapper.text()).toContain('Awaiting Payment Update');
        listeners['client-payment.pay-1:PaymentTransactionStateUpdated']({
            state: {id: 'st-2', code: 'AUTHORIZED', color_scheme: 'green'},
            shared_reference: 'REF-2',
            payment_url: null,
        });
        await flushPromises();
        const redirects = setTimeoutSpy.mock.calls.filter(([, delay]) => delay === 1500);
        expect(redirects).toHaveLength(1);
        redirects[0][0]();
        expect(router.push).toHaveBeenCalledWith({name: 'viewTransaction', params: {transactionId: 'trx-1'}});
    });
});
