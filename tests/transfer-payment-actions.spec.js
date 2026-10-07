import {afterEach, describe, expect, it, vi} from "vitest";
import {fixture} from "./fixtures.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));

// SD-1423. The console lets a customer cancel a transfer's waiting payment and
// pay for the same transfer again (SD-1418). Which of the two the app offers is
// decided from three fields already on the transfer: the payment's state, whether
// the customer said "I've paid", and the transfer's state. These are the rows of
// the handout's table, in its order.
const axios = (await import('axios')).default;
const {default: Transaction} = await import('@/models/transaction.js');
const {useTransactionUtils} = await import('@/composables/transaction_utils.js');

afterEach(() => {
    vi.clearAllMocks();
});

/**
 * The captured transfer (Monoova, bank transfer) with its payment and transfer
 * states replaced.
 */
function transfer({payment, confirmed = false, state = 'PENDING-PAYMENT', provider = 'MONOOVA'}) {
    const data = fixture('transaction-detail');
    data.state.code = state;
    data.payment.state.code = payment;
    data.payment.customer_confirmed_payment = confirmed;
    data.payment.payment_provider.code = provider;

    return Transaction.getInstance(data);
}

const OPEN_TRANSFER = ['CREATED', 'INITIATED', 'PENDING-PAYMENT'];

describe('which button a transfer offers', () => {
    it.each(OPEN_TRANSFER.flatMap(state => ['CREATED', 'INITIALIZED', 'PENDING'].map(payment => [payment, state])))(
        'a waiting %s payment on a %s transfer offers Cancel payment, not Pay again',
        (payment, state) => {
            const transaction = transfer({payment, state});

            expect(transaction.canCancelPayment).toBe(true);
            expect(transaction.canPayAgain).toBe(false);
            expect(transaction.hasOpenPayment).toBe(true);
        },
    );

    it('offers no Cancel once the customer has said they paid', () => {
        for (const payment of ['CREATED', 'INITIALIZED', 'PENDING']) {
            const transaction = transfer({payment, confirmed: true});

            expect(transaction.canCancelPayment).toBe(false);
            expect(transaction.canPayAgain).toBe(false);
        }
    });

    it('offers no Cancel on a REDIRECTED payment, which the api refuses', () => {
        const transaction = transfer({payment: 'REDIRECTED'});

        expect(transaction.canCancelPayment).toBe(false);
        expect(transaction.canPayAgain).toBe(false);
        expect(transaction.hasOpenPayment).toBe(true);
    });

    it.each(OPEN_TRANSFER.flatMap(state => ['CANCELLED', 'FAILED', 'TIMED-OUT'].map(payment => [payment, state])))(
        'a %s payment on a %s transfer offers Pay again',
        (payment, state) => {
            const transaction = transfer({payment, state});

            expect(transaction.canPayAgain).toBe(true);
            expect(transaction.canCancelPayment).toBe(false);
            expect(transaction.hasOpenPayment).toBe(false);
        },
    );

    it('offers neither once the platform has closed the transfer', () => {
        for (const payment of ['CANCELLED', 'FAILED', 'TIMED-OUT']) {
            const transaction = transfer({payment, state: 'CANCELLED'});

            expect(transaction.canPayAgain).toBe(false);
            expect(transaction.canCancelPayment).toBe(false);
        }
    });

    it('offers neither on a payment that took money', () => {
        for (const payment of ['AUTHORIZED', 'CAPTURED', 'PART-REFUNDED', 'REFUNDED']) {
            for (const state of [...OPEN_TRANSFER, 'PAYMENT-CLEARED', 'PAYOUT-SUCCESS']) {
                const transaction = transfer({payment, state});

                expect(transaction.canPayAgain).toBe(false);
                expect(transaction.canCancelPayment).toBe(false);
            }
        }
    });
});

// SD-1422: cancelling changes only our own record except where the gateway can
// withdraw the payment. A hosted checkout stays payable at the provider.
describe('which gateways offer Cancel payment', () => {
    it('offers it on Monoova and on a manual bank transfer', () => {
        expect(transfer({payment: 'PENDING', provider: 'MONOOVA'}).canCancelPayment).toBe(true);
        expect(transfer({payment: 'PENDING', provider: 'MANUAL-PAYMENT'}).canCancelPayment).toBe(true);
    });

    it('does not offer it where the provider would still take the money', () => {
        for (const provider of ['PAY360', 'PAY-CROSS', 'VOLUME-PAYMENTS', 'APAYLO', 'FINCODE', 'CINET_PAY', 'BELMONEY-CARD', 'CHECKOUT-COM', 'PAGA']) {
            expect(transfer({payment: 'PENDING', provider}).canCancelPayment).toBe(false);
        }
    });

    it('still offers Pay again whatever the gateway', () => {
        expect(transfer({payment: 'TIMED-OUT', provider: 'PAY360'}).canPayAgain).toBe(true);
    });
});

// Captured on Payvel staging on 27 Sep; see tests/fixtures/README.md.
describe('the captured transfers', () => {
    it('a waiting Monoova payment offers Cancel and its account details', () => {
        const transaction = Transaction.getInstance(fixture('transaction-detail-payment-pending-account'));

        expect(transaction.canCancelPayment).toBe(true);
        expect(transaction.canPayAgain).toBe(false);
        expect(transaction.hasOpenPayment).toBe(true);
    });

    it('a cancelled one offers Pay again and hides the account it kept', () => {
        const transaction = Transaction.getInstance(fixture('transaction-detail-payment-cancelled'));

        expect(transaction.payment.clientPaymentAccount).not.toBeNull();
        expect(transaction.canPayAgain).toBe(true);
        expect(transaction.canCancelPayment).toBe(false);
        expect(transaction.hasOpenPayment).toBe(false);
    });
});

describe('cancelPayment', () => {
    it('posts to the transfer, not the payment, with no body', async () => {
        axios.post.mockResolvedValue({status: 200, data: {}});

        await useTransactionUtils().cancelPayment('txn-1');

        expect(axios.post).toHaveBeenCalledWith('/client/v1/transaction/payment/txn-1/cancel');
    });
});
