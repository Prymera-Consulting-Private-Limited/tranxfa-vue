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
     * @type {Boolean|null}
     */
    collectionPinAvailable = false;

    /**
     * @type {String|null}
     */
    collectionPin = null;

    /**
     * @type {PayoutTransactionState|null}
     */
    state = null;

    static getInstance(data) {
        const payoutTransaction = new PayoutTransaction();
        payoutTransaction.id = data.id;
        payoutTransaction.sharedReference = data.shared_reference;
        payoutTransaction.collectionPin = data.collection_pin;
        payoutTransaction.collectionPinAvailable = data.collection_pin_available || false;
        if (data.state) {
            payoutTransaction.state = PayoutTransactionState.getInstance(data.state);
        }

        return payoutTransaction;
    }
}

export default PayoutTransaction;