import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {createPinia, setActivePinia} from "pinia";
import {fixture} from "./fixtures.js";
import {installFakeEcho, modalStubs} from "./helpers.js";
import Transaction from "@/models/transaction.js";
import {PURCHASE_WINDOW_HOURS, trackKycApproved, trackPaymentConfirmed, trackSignUp} from "@/marketing_events.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn(), replace: vi.fn(), currentRoute: {value: {query: {}}}}}));
vi.mock('@/components/CustomerLayout.vue', () => ({default: {name: 'CustomerLayout', template: '<div><slot /></div>'}}));

const axios = (await import('axios')).default;
const {default: ItemView} = await import('@/views/Transaction/ItemView.vue');
const {useCustomerStore} = await import('@/stores/customer.js');

// SD-2059: Xenvia's Google Ads events, sent where the Meta Pixel's fire.
// - sign_up: the account is created.
// - purchase: every transfer whose payment is confirmed, once, with the amount
//   sent, the currency and the transfer reference as transaction_id.
// The Pixel keeps counting only a customer's first purchase, as it has since July.

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse('2026-11-20T12:00:00Z');

// A captured transfer, made a Xenvia one: paid in euros, its payment confirmed
// an hour ago.
function paidTransfer({id = 'trx-1', number = 'XV1001', stateCode = 'CAPTURED', changedAt = NOW - HOUR} = {}) {
    const payload = structuredClone(fixture('transaction-detail'));
    payload.id = id;
    payload.transaction_number = number;
    payload.local_amount = '150.00';
    payload.payment_currency = {...payload.payment_currency, code: 'EUR', iso_alpha: 'EUR'};
    payload.payment.state = {...payload.payment.state, code: stateCode};
    payload.payment.updated_at = changedAt === null ? null : new Date(changedAt).toISOString();

    return payload;
}

const purchases = () => window.gtag.mock.calls.filter(([command, name]) => command === 'event' && name === 'purchase');
const pixelPurchases = () => window.fbq.mock.calls.filter(([, name]) => name === 'Purchase');

beforeEach(() => {
    localStorage.clear();
    window.gtag = vi.fn();
    window.fbq = vi.fn();
});

afterEach(() => {
    vi.clearAllMocks();
    delete window.gtag;
    delete window.fbq;
});

describe('sign_up', () => {
    it('goes to Google beside the Pixel\'s CompleteRegistration', () => {
        trackSignUp();

        expect(window.gtag).toHaveBeenCalledWith('event', 'sign_up', {method: 'email'});
        expect(window.fbq).toHaveBeenCalledWith('track', 'CompleteRegistration');
    });

    it('still reaches Google before consent, when the Pixel is not on the page', () => {
        delete window.fbq;

        expect(() => trackSignUp()).not.toThrow();
        expect(window.gtag).toHaveBeenCalledWith('event', 'sign_up', {method: 'email'});
    });
});

describe('KYCApproved', () => {
    it('stays a Pixel event only', () => {
        trackKycApproved();

        expect(window.fbq).toHaveBeenCalledWith('trackCustom', 'KYCApproved');
        expect(window.gtag).not.toHaveBeenCalled();
    });
});

describe('purchase', () => {
    it('carries the transfer reference, the amount sent and its currency', () => {
        trackPaymentConfirmed(Transaction.getInstance(paidTransfer()), 'cus-1', NOW);

        expect(purchases()).toEqual([['event', 'purchase', {transaction_id: 'XV1001', value: 150, currency: 'EUR'}]]);
    });

    it('counts every transfer, not only the first', () => {
        trackPaymentConfirmed(Transaction.getInstance(paidTransfer({id: 'trx-1', number: 'XV1001'})), 'cus-1', NOW);
        trackPaymentConfirmed(Transaction.getInstance(paidTransfer({id: 'trx-2', number: 'XV1002'})), 'cus-1', NOW);

        expect(purchases().map(([, , params]) => params.transaction_id)).toEqual(['XV1001', 'XV1002']);
    });

    it('counts a transfer once, however often its page is opened', () => {
        const transfer = paidTransfer();

        trackPaymentConfirmed(Transaction.getInstance(transfer), 'cus-1', NOW);
        trackPaymentConfirmed(Transaction.getInstance(transfer), 'cus-1', NOW + HOUR);

        expect(purchases()).toHaveLength(1);
    });

    it('counts an authorised payment as confirmed', () => {
        trackPaymentConfirmed(Transaction.getInstance(paidTransfer({stateCode: 'AUTHORIZED'})), 'cus-1', NOW);

        expect(purchases()).toHaveLength(1);
    });

    it('waits while the payment is not confirmed', () => {
        trackPaymentConfirmed(Transaction.getInstance(paidTransfer({stateCode: 'PENDING'})), 'cus-1', NOW);
        expect(purchases()).toEqual([]);

        // ...and still counts it once it is.
        trackPaymentConfirmed(Transaction.getInstance(paidTransfer({stateCode: 'CAPTURED'})), 'cus-1', NOW);
        expect(purchases()).toHaveLength(1);
    });

    it(`counts a payment confirmed within ${PURCHASE_WINDOW_HOURS} hours`, () => {
        trackPaymentConfirmed(Transaction.getInstance(paidTransfer({changedAt: NOW - (PURCHASE_WINDOW_HOURS - 1) * HOUR})), 'cus-1', NOW);

        expect(purchases()).toHaveLength(1);
    });

    // Without this, a customer's first visit after release would report every
    // transfer in their history as a new purchase.
    it('does not count an older transfer opened from the history', () => {
        trackPaymentConfirmed(Transaction.getInstance(paidTransfer({changedAt: NOW - (PURCHASE_WINDOW_HOURS + 1) * HOUR})), 'cus-1', NOW);
        trackPaymentConfirmed(Transaction.getInstance(paidTransfer({id: 'trx-3', changedAt: null})), 'cus-1', NOW);

        expect(purchases()).toEqual([]);
    });

    it('is not sent without an amount it can read', () => {
        const transfer = paidTransfer();
        transfer.local_amount = null;

        trackPaymentConfirmed(Transaction.getInstance(transfer), 'cus-1', NOW);

        expect(purchases()).toEqual([]);
    });
});

describe('the Pixel\'s Purchase', () => {
    it('still counts only the customer\'s first, as it did', () => {
        trackPaymentConfirmed(Transaction.getInstance(paidTransfer({id: 'trx-1'})), 'cus-1', NOW);
        trackPaymentConfirmed(Transaction.getInstance(paidTransfer({id: 'trx-2'})), 'cus-1', NOW);

        expect(pixelPurchases()).toEqual([['track', 'Purchase', {value: '150.00', currency: 'EUR'}]]);
    });

    it('is not sent before consent, when the Pixel is not on the page', () => {
        delete window.fbq;

        trackPaymentConfirmed(Transaction.getInstance(paidTransfer()), 'cus-1', NOW);

        expect(localStorage.getItem('fbq_first_purchase_tracked_cus-1')).toBeNull();
        expect(purchases()).toHaveLength(1);
    });
});

// The wiring: the transfer's page sends purchase when it loads a confirmed
// payment, which is where the customer lands after paying by card.
describe('the transfer page', () => {
    it('sends purchase for a payment just confirmed', async () => {
        setActivePinia(createPinia());
        useCustomerStore().customer.data = {id: 'cus-1'};
        installFakeEcho();
        axios.get.mockResolvedValue({data: paidTransfer({changedAt: Date.now() - HOUR})});

        mount(ItemView, {
            props: {id: 'trx-1'},
            global: {stubs: {...modalStubs, RouterLink: {template: '<a><slot /></a>'}, Monoova: true, ManualPayment: true, PagaPayment: true}},
        });
        await flushPromises();

        expect(purchases()).toEqual([['event', 'purchase', {transaction_id: 'XV1001', value: 150, currency: 'EUR'}]]);
    });
});
