import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {reactive} from "vue";
import axios from "axios";
import BelmoneyCard from "@/components/Payment/BelmoneyCard.vue";
import PaymentView from "@/views/Transfer/PaymentView.vue";
import PaymentTransaction from "@/models/payment_transaction.js";
import router from "@/router/index.js";
import {installFakeEcho, makeTransaction, makeTransactionPayload, modalStubs, stateFaceStubs} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn()}}));
vi.mock('@/components/CustomerLayout.vue', () => ({default: {name: 'CustomerLayout', template: '<div><slot /></div>'}}));

// Belmoney Card, from the back office's handout: a hosted card page, same
// tab, that can also take the card with no redirect at all. The API marks
// that with awaiting_confirmation, so PENDING with no URL is healthy here.

describe('the payment model', () => {
    it('reads awaiting_confirmation and treats an absent key as false', () => {
        const base = makeTransactionPayload({providerCode: 'BELMONEY-CARD'}).payment;
        expect(PaymentTransaction.getInstance({...base, awaiting_confirmation: true}).awaitingConfirmation).toBe(true);
        expect(PaymentTransaction.getInstance({...base, awaiting_confirmation: false}).awaitingConfirmation).toBe(false);
        delete base.awaiting_confirmation;
        expect(PaymentTransaction.getInstance(base).awaitingConfirmation).toBe(false);
    });

    // The API's failure_reason is operator text that names processors. It is
    // not mapped, so nothing can render it by accident.
    it('does not carry failure_reason', () => {
        const base = makeTransactionPayload({providerCode: 'BELMONEY-CARD', stateCode: 'FAILED'}).payment;
        const payment = PaymentTransaction.getInstance({...base, failure_reason: 'Belmoney refused the payment'});
        expect(JSON.stringify(payment)).not.toContain('Belmoney refused');
    });
});

describe('BelmoneyCard', () => {
    let setIntervalSpy;

    beforeEach(() => {
        vi.clearAllMocks();
        // The first poll must not overwrite what a test set up by hand.
        axios.get.mockRejectedValue(new Error('no poll in this test'));
        installFakeEcho();
        setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockReturnValue(1);
        vi.spyOn(globalThis, 'setTimeout').mockReturnValue(2);
    });

    afterEach(() => vi.restoreAllMocks());

    function mountWith(options) {
        const transaction = reactive(makeTransaction({providerCode: 'BELMONEY-CARD', ...options}));
        const wrapper = mount(BelmoneyCard, {props: {transaction}, global: {stubs: {...stateFaceStubs}}});
        return {transaction, wrapper};
    }

    it('shows the Pay button, same tab, when PENDING has a URL', () => {
        const {wrapper} = mountWith({stateCode: 'PENDING', paymentUrl: 'https://pay.example/card'});
        const anchor = wrapper.find('a[href="https://pay.example/card"]');
        expect(anchor.exists()).toBe(true);
        expect(anchor.attributes('target')).toBeUndefined();
        expect(wrapper.text()).toContain('Pay AUD 100.00');
    });

    it('shows the confirming screen, not the stuck notice, when the provider is settling it', () => {
        const {wrapper} = mountWith({stateCode: 'PENDING', awaitingConfirmation: true});
        expect(wrapper.text()).toContain("We're confirming your payment");
        expect(wrapper.text()).not.toContain('taking longer than usual');
        expect(wrapper.find('a[href]').exists()).toBe(false);
    });

    it('keeps polling while the provider is settling it, so the webhook result lands', () => {
        mountWith({stateCode: 'PENDING', awaitingConfirmation: true});
        expect(setIntervalSpy.mock.calls.some(([, delay]) => delay === 10000)).toBe(true);
    });

    // The payment resource does not carry awaiting_confirmation today
    // (SD-1039): for Belmoney, PENDING with no URL is the provider settling
    // the card itself, so that face shows with or without the flag.
    it('shows the confirming screen when PENDING has no URL, flag or not', () => {
        expect(mountWith({stateCode: 'PENDING'}).wrapper.text()).toContain('confirming your payment');
        expect(mountWith({stateCode: 'PENDING', awaitingConfirmation: true}).wrapper.text()).toContain('confirming your payment');
    });

    it('shows the stuck notice after a minute even while the provider is settling it', async () => {
        vi.restoreAllMocks();
        vi.useFakeTimers();
        axios.get.mockResolvedValue({data: makeTransactionPayload({providerCode: 'BELMONEY-CARD', stateCode: 'PENDING'})});
        const stuck = mountWith({stateCode: 'PENDING'});
        await flushPromises();
        await vi.advanceTimersByTimeAsync(61_000);
        await flushPromises();
        expect(stuck.wrapper.text()).toContain('taking longer than usual');
        vi.useRealTimers();
    });

    it('uses our own wording on a failure and offers a retry', async () => {
        const {wrapper} = mountWith({stateCode: 'FAILED'});
        expect(wrapper.text()).toContain('Payment failed');
        expect(wrapper.text()).toContain('billing address');
        await wrapper.find('button').trigger('click');
        expect(wrapper.emitted('retryPayment')).toHaveLength(1);
    });

    it('shows the received face once a poll finds it CAPTURED', async () => {
        axios.get.mockResolvedValue({data: makeTransactionPayload({providerCode: 'BELMONEY-CARD', stateCode: 'CAPTURED'})});
        const {wrapper} = mountWith({stateCode: 'PENDING', awaitingConfirmation: true});
        await flushPromises();
        expect(wrapper.text()).toContain('Payment received');
        expect(globalThis.setTimeout).toHaveBeenCalledWith(expect.any(Function), 1500);
    });

    it('shows the cancelled face when the expiry sweep cancels it', () => {
        const {wrapper} = mountWith({stateCode: 'CANCELLED'});
        expect(wrapper.text()).toContain('This payment was cancelled');
        expect(wrapper.text()).toContain('No money has moved');
    });
});

describe('PaymentView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        installFakeEcho();
    });

    it('dispatches BELMONEY-CARD to the Belmoney component', async () => {
        axios.get.mockResolvedValue({data: makeTransactionPayload({providerCode: 'BELMONEY-CARD', paymentUrl: 'https://pay.example/card'})});
        const wrapper = mount(PaymentView, {props: {id: 'trx-1'}, global: {stubs: {...modalStubs, BelmoneyCard: true}}});
        await flushPromises();
        expect(wrapper.findComponent({name: 'BelmoneyCard'}).exists()).toBe(true);
        expect(wrapper.text()).not.toContain("isn't available in the app yet");
    });
});
