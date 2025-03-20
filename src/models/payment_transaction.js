import PaymentTransactionState from "@/models/payment_transaction_state.js";

class PaymentTransaction {
    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {Object|null}
     */
    paymentAccount = null;

    /**
     * @type {Object|null}
     */
    paymentMethod = null;

    /**
     * @type {Object|null}
     */
    paymentProvider = null;

    /**
     * @type {String|null}
     */
    sharedReference = null;

    /**
     * @type {String|null}
     */
    totalPaymentAmount = null;

    /**
     * @type {String|null}
     */
    totalPaymentAmountFormatted = null;

    /**
     * @type {String|null}
     */
    totalPaymentAmountCurrencyPrefixed = null;

    /**
     * @type {String|null}
     */
    createdAt = null;

    /**
     * @type {String|null}
     */
    updatedAt = null

    /**
     * @type {PaymentTransactionState|null}
     */
    state = null;

    static getInstance(data) {
        const paymentTransaction = new PaymentTransaction();
        paymentTransaction.id = data.id;
        paymentTransaction.paymentAccount = data.payment_account;
        paymentTransaction.paymentMethod = data.payment_method;
        paymentTransaction.paymentProvider = data.payment_provider;
        paymentTransaction.sharedReference = data.shared_reference;
        paymentTransaction.totalPaymentAmount = data.total_payment_amount;
        paymentTransaction.totalPaymentAmountFormatted = data.total_payment_amount_formatted;
        paymentTransaction.totalPaymentAmountCurrencyPrefixed = data.total_payment_amount_currency_prefixed;
        paymentTransaction.createdAt = data.created_at;
        paymentTransaction.updatedAt = data.updated_at;
        if (data.state) {
            paymentTransaction.state = PaymentTransactionState.getInstance(data.state);
        }

        return paymentTransaction;
    }
}

export default PaymentTransaction;