import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fixture} from "./fixtures.js";
import {flushPromises, mount} from "@vue/test-utils";
import {reactive} from "vue";
import axios from "axios";
import router from "@/router/index.js";
import ManualPayment from "@/components/Payment/ManualPayment.vue";
import Monoova from "@/components/Payment/Monoova.vue";
import PagaPayment from "@/components/Payment/PagaPayment.vue";
import CinetPay from "@/components/Payment/CinetPay.vue";
import Volume from "@/components/Payment/Volume.vue";
import Fincode from "@/components/Payment/Fincode.vue";
import PaymentView from "@/views/Transfer/PaymentView.vue";
import Confirm from "@/components/Transaction/Confirm.vue";
import TransactionQuote from "@/models/transaction_quote.js";
import {fieldlessErrors} from "@/composables/api_utils.js";
import {installFakeEcho, makeTransaction, makeTransactionPayload, modalStubs, stateFaceStubs} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn()}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn(), replace: vi.fn(), currentRoute: {value: {query: {}}}}}));
vi.mock('@/components/CustomerLayout.vue', () => ({default: {name: 'CustomerLayout', template: '<div><slot /></div>'}}));

const linkStub = {name: 'RouterLink', props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>'};
const stubs = {...stateFaceStubs, RouterLink: linkStub, ClientPaymentAccount: true, UseClipboard: true};

// Five providers computed a status for pending, processing, completed and
// failed only, so an expired PayID window opened an empty white modal.
describe.each([
    ['ManualPayment', ManualPayment, 'MANUAL-PAYMENT'],
    ['Monoova', Monoova, 'MONOOVA'],
    ['PagaPayment', PagaPayment, 'PAGA'],
    ['CinetPay', CinetPay, 'CINET_PAY'],
    ['Volume', Volume, 'VOLUME-PAYMENTS'],
])('%s in a terminal state', (name, component, providerCode) => {
    beforeEach(() => {
        vi.clearAllMocks();
        installFakeEcho();
        axios.get.mockReturnValue(new Promise(() => {}));
    });

    const mountIn = (stateCode) => mount(component, {props: {transaction: reactive(makeTransaction({stateCode, providerCode}))}, global: {stubs}});

    it('says the payment expired', () => {
        expect(mountIn('TIMED-OUT').text()).toContain('This payment has expired');
    });

    it('says the payment was cancelled and no money moved', () => {
        const text = mountIn('CANCELLED').text();
        expect(text).toContain('This payment was cancelled');
        expect(text).toContain('No money has moved');
    });

    it('says a refund is on its way', () => {
        expect(mountIn('REFUNDED').text()).toContain('Payment refunded');
    });
});

describe('the payment modal', () => {
    const dialogStubs = {
        ...modalStubs,
        Dialog: {name: 'Dialog', emits: ['close'], template: '<div><button class="backdrop" @click="$emit(\'close\')" /><slot /></div>'},
        ModalCloseButton: {name: 'ModalCloseButton', emits: ['close'], template: '<button class="close" @click="$emit(\'close\')" />'},
        ManualPayment: true, PagaPayment: true, Monoova: true, Volume: true, Apaylo: true, Pay360: true, PayCross: true, Fincode: true, CinetPay: true, WalletPayment: true,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        installFakeEcho();
        axios.get.mockResolvedValue({data: makeTransactionPayload({providerCode: 'FINCODE', paymentUrl: 'https://pay.example/1'})});
    });

    // A backdrop tap navigated to the transaction page, which for the
    // redirect providers had no way back to the payment.
    it('stays open when the backdrop is tapped', async () => {
        const wrapper = mount(PaymentView, {props: {id: 'trx-1'}, global: {stubs: dialogStubs}});
        await flushPromises();

        await wrapper.get('button.backdrop').trigger('click');

        expect(router.push).not.toHaveBeenCalled();
    });

    it('leaves through the close button', async () => {
        const wrapper = mount(PaymentView, {props: {id: 'trx-1'}, global: {stubs: dialogStubs}});
        await flushPromises();

        await wrapper.get('button.close').trigger('click');

        expect(router.push).toHaveBeenCalledWith({name: 'viewTransaction', params: {transactionId: 'trx-1'}});
    });
});

describe('the review before confirming', () => {
    it('shows the name the money is going to', () => {
        const quote = TransactionQuote.getInstance(fixture('transaction-quote-with-recipient'));
        // The recorded fixture carries no name entry; the shape is what the
        // API sends for a channel that asks for the account holder's name.
        quote.recipient.accountDetailHashMap.push({type: 'name', key: 'Account holder', value: 'Grace Hopper'});

        const wrapper = mount(Confirm, {props: {quote}, global: {stubs: {RouterLink: linkStub}}});

        expect(wrapper.text()).toContain('Grace Hopper');
    });
});

// Confirm-step refusals other than payment-data fields were stored and never
// rendered.
describe('fieldlessErrors', () => {
    it('keeps the messages that have no field of their own', () => {
        expect(fieldlessErrors({
            'payment_data.account': ['Required.'],
            purpose_id: ['Choose a purpose.'],
            third_party_declaration_accepted: ['You must confirm this.'],
        }, 'payment_data.')).toEqual(['Choose a purpose.', 'You must confirm this.']);
    });

    it('copes with an empty or odd error bag', () => {
        expect(fieldlessErrors(null, 'x.')).toEqual([]);
        expect(fieldlessErrors([], 'x.')).toEqual([]);
        expect(fieldlessErrors({a: 'single'}, 'x.')).toEqual(['single']);
    });
});

describe('a provider redirect scheduled by a state change', () => {
    let listeners;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        listeners = installFakeEcho();
        axios.get.mockReturnValue(new Promise(() => {}));
    });

    afterEach(() => vi.useRealTimers());

    const captured = () => listeners['client-payment.pay-1:PaymentTransactionStateUpdated']({state: {id: 's', code: 'CAPTURED', color_scheme: 'green'}});

    it('goes to the transaction after a moment', async () => {
        mount(Fincode, {props: {transaction: reactive(makeTransaction({stateCode: 'PENDING', providerCode: 'FINCODE', paymentUrl: 'https://p'}))}, global: {stubs}});
        await flushPromises();
        captured();

        await vi.advanceTimersByTimeAsync(1500);
        expect(router.push).toHaveBeenCalledWith({name: 'viewTransaction', params: {transactionId: 'trx-1'}});
    });

    it('does not fire after the modal is gone', async () => {
        const wrapper = mount(Fincode, {props: {transaction: reactive(makeTransaction({stateCode: 'PENDING', providerCode: 'FINCODE', paymentUrl: 'https://p'}))}, global: {stubs}});
        await flushPromises();
        captured();
        wrapper.unmount();

        await vi.advanceTimersByTimeAsync(1500);
        expect(router.push).not.toHaveBeenCalled();
    });
});
