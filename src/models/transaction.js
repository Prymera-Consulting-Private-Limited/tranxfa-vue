import BaseTransaction from "@/models/base_transaction.js";
import Recipient from "@/models/recipient.js";
import TransactionState from "@/models/transaction_state.js";
import PaymentTransaction from "@/models/payment_transaction.js";
import TransactionDocument from "@/models/transaction_document.js";
import PayoutTransaction from "@/models/payout_transaction.js";
import PaymentState from "@/enums/payment_state.js";
import TransactionStateCode from "@/enums/transaction_state.js";

// Still being paid for: nothing has cleared and the platform has not closed it.
const AWAITING_PAYMENT = [TransactionStateCode.CREATED, TransactionStateCode.INITIATED, TransactionStateCode['PENDING-PAYMENT']];

// Waiting for the customer's money. REDIRECTED is the customer at the provider,
// or having said "I've paid"; the api refuses to cancel it.
const WAITING = [PaymentState.CREATED, PaymentState.INITIALIZED, PaymentState.PENDING];

// Over without any money moving, so the transfer can open a new payment.
const ENDED_UNPAID = [PaymentState.CANCELLED, PaymentState.FAILED, PaymentState.TIMED_OUT];

// Gateways that really stop expecting the money when a payment is cancelled
// (SD-1422): Monoova releases its reconciliation rule, and a manual bank
// transfer holds nothing anywhere. On a hosted checkout the provider's page stays
// live, so a cancelled payment can still be paid there and needs a refund by hand.
const CANCELLABLE_PROVIDERS = ['MONOOVA', 'MANUAL-PAYMENT'];

class Transaction extends BaseTransaction {
    /**
     * @type {string|null}
     */
    createdAt = null;

    /**
     * @type {string|null}
     */
    updatedAt = null;

    /**
     * @type {Array}
     */
    documents = [];

    /**
     * @type {Array}
     */
    pendingDocuments = [];

    /**
     * @type {Recipient|null}
     */
    recipient = null;

    /**
     * @type {TransactionState|null}
     */
    state = null;

    /**
     * @type {PaymentTransaction|null}
     */
    payment = null;

    /**
     * @type {PayoutTransaction|null}
     */
    payout = null;

    /**
     * @type {number|null}
     */
    transactionNumber = null;

    get isAwaitingPayment() {
        return AWAITING_PAYMENT.includes(this.state?.code);
    }

    /**
     * The customer can still pay into this payment, so its bank details are
     * worth showing.
     */
    get hasOpenPayment() {
        return [...WAITING, PaymentState.REDIRECTED].includes(this.payment?.state?.code);
    }

    /**
     * Offer Cancel payment (SD-1418). Never once the customer has said they
     * paid: a deposit that lands on a cancelled payment is not credited to the
     * transfer, and an operator has to place it by hand.
     */
    get canCancelPayment() {
        return this.isAwaitingPayment
            && WAITING.includes(this.payment?.state?.code)
            && this.payment.customerConfirmedPayment !== true
            && CANCELLABLE_PROVIDERS.includes(this.payment.paymentProvider?.code);
    }

    /**
     * Offer Pay again: a new payment on the same transfer, at its original
     * amount and rate. A transfer the platform has closed cannot be paid.
     */
    get canPayAgain() {
        return this.isAwaitingPayment && ENDED_UNPAID.includes(this.payment?.state?.code);
    }

    static getInstance(data) {
        const transaction = new Transaction();
        transaction.createdAt = data.created_at;
        transaction.updatedAt = data.updated_at;
        transaction.transactionNumber = data.transaction_number;
        if (data.recipient) {
            transaction.recipient = Recipient.getInstance(data.recipient);
        }
        transaction.state = TransactionState.getInstance(data.state);
        if (data.payment) {
            transaction.payment = PaymentTransaction.getInstance(data.payment);
        }
        if (data.payout) {
            transaction.payout = PayoutTransaction.getInstance(data.payout);
        }
        if (data.pending_documents?.length > 0) {
            transaction.pendingDocuments = data.pending_documents.map(o => TransactionDocument.getInstance(o));
        }
        BaseTransaction.getInstance(transaction, data);

        return transaction;
    }
}

export default Transaction;