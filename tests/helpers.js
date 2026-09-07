import {vi} from "vitest";
import Transaction from "@/models/transaction.js";
import PaymentTransaction from "@/models/payment_transaction.js";
import PaymentTransactionState from "@/models/payment_transaction_state.js";

/**
 * A Transaction instance shaped the way the payment components read it.
 */
export function makeTransaction({stateCode, paymentUrl = null, providerCode = 'FINCODE', clientPaymentAccount = null, paymentTerms = null, expiresAt = null} = {}) {
    const transaction = new Transaction();
    transaction.id = 'trx-1';

    const payment = new PaymentTransaction();
    payment.id = 'pay-1';
    payment.state = PaymentTransactionState.getInstance({id: 'st-1', code: stateCode, color_scheme: 'blue'});
    payment.paymentUrl = paymentUrl;
    payment.paymentProvider = {id: 'pp-1', code: providerCode, title: providerCode};
    payment.totalPaymentAmountCurrencyPrefixed = 'AUD 100.00';
    payment.sharedReference = 'REF-1';
    payment.clientPaymentAccount = clientPaymentAccount;
    payment.paymentTerms = paymentTerms;
    payment.expiresAt = expiresAt;
    transaction.payment = payment;

    return transaction;
}

/**
 * An API-shaped payload accepted by Transaction.getInstance.
 */
export function makeTransactionPayload({stateCode = 'PENDING', paymentUrl = null, providerCode = 'FINCODE'} = {}) {
    return {
        id: 'trx-1',
        transaction_number: 1001,
        created_at: '2026-09-01T10:00:00+00:00',
        updated_at: '2026-09-01T10:00:00+00:00',
        state: {
            id: 'ts-1',
            code: 'PENDING-PAYMENT',
            label: 'Pending Payment',
            description: 'Waiting for your payment.',
            progress: '20',
            color_scheme: 'blue',
        },
        payment: {
            id: 'pay-1',
            payment_method: {id: 'pm-1', code: 'OPEN-BANKING', title: 'Open Banking'},
            payment_provider: {id: 'pp-1', code: providerCode, title: 'Fincode'},
            state: {id: 'st-1', code: stateCode, color_scheme: 'blue'},
            payment_url: paymentUrl,
            shared_reference: 'REF-1',
            total_payment_amount: '100.00',
            total_payment_amount_formatted: '100.00',
            total_payment_amount_currency_prefixed: 'AUD 100.00',
            customer_confirmed_payment: false,
        },
    };
}

/**
 * Replaces the global Echo with a recorder. Returns the listener map keyed
 * "<channel>:<event>" so tests can fire events by hand.
 */
export function installFakeEcho() {
    const listeners = {};
    globalThis.Echo = {
        channel: (name) => ({
            listen: (event, callback) => {
                listeners[`${name}:${event}`] = callback;
            },
        }),
        leaveChannel: vi.fn(),
    };
    return listeners;
}

const passthrough = (name) => ({name, template: '<div><slot /></div>'});

/**
 * Stubs for the modal scaffolding shared by the payment views: layout and
 * HeadlessUI pieces reduced to slot passthroughs, with TransitionRoot keeping
 * its `show` gate so open/closed behaviour is preserved.
 */
export const modalStubs = {
    CustomerLayout: passthrough('CustomerLayout'),
    Dialog: passthrough('Dialog'),
    DialogPanel: passthrough('DialogPanel'),
    TransitionChild: passthrough('TransitionChild'),
    TransitionRoot: {name: 'TransitionRoot', props: ['show'], template: '<div v-if="show"><slot /></div>'},
    ModalCloseButton: true,
};

/**
 * Stubs for the lottie state faces the payment components render.
 */
export const stateFaceStubs = {
    AwaitingPending: true,
    Processing: true,
    PaymentCompleted: true,
    Failed: true,
    RouterLink: {name: 'RouterLink', template: '<a><slot /></a>'},
};
