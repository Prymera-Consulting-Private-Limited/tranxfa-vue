import BaseTransaction from "@/models/base_transaction.js";
import Recipient from "@/models/recipient.js";
import TransactionState from "@/models/transaction_state.js";
import PaymentTransaction from "@/models/payment_transaction.js";

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
     * @type {number|null}
     */
    transactionNumber = null;
    static getInstance(data) {
        const transaction = new Transaction();
        transaction.createdAt = data.created_at;
        transaction.updatedAt = data.updated_at;
        if (data.recipient) {
            transaction.recipient = Recipient.getInstance(data.recipient);
        }
        transaction.state = TransactionState.getInstance(data.state);
        if (data.payment) {
            transaction.payment = PaymentTransaction.getInstance(data.payment);
        }
        BaseTransaction.getInstance(transaction, data);

        return transaction;
    }
}

export default Transaction;