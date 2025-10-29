import PayoutTransactionState from "@/models/payout_transaction_state.js";

class PayoutTransaction {
    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {String|null}
     */
    sharedReference = null;

    /**
     * @type {String|null}
     */
    collectionPin = null;

    /**
     * @type {String|null}
     */
    createdAt = null;

    /**
     * @type {String|null}
     */
    updatedAt = null

    /**
     * @type {PayoutTransactionState|null}
     */
    state = null;

    static getInstance(data) {
        const payoutTransaction = new PayoutTransaction();
        payoutTransaction.id = data.id;
        payoutTransaction.sharedReference = data.shared_reference;
        payoutTransaction.collectionPin = data.collection_pin;
        if (data.state) {
            payoutTransaction.state = PayoutTransactionState.getInstance(data.state);
        }

        return payoutTransaction;
    }
}

export default PayoutTransaction;