import PaymentTransactionState from "@/models/payment_transaction_state.js";
import PaymentMethod from "@/models/payment_method.js";
import PaymentProvider from "@/models/payment_provider.js";
import PaymentAccount from "@/models/payment_account.js";
import ClientPaymentAccount from "@/models/client_payment_account.js";

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
     * @type {ClientPaymentAccount|null}
     */
    clientPaymentAccount = null;

    /**
     * @type {Boolean|null}
     */
    customerConfirmedPayment = null;

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
        if (data.payment_account) {
            paymentTransaction.paymentAccount = PaymentAccount.getInstance(data.payment_account);
        }

        paymentTransaction.paymentMethod = PaymentMethod.getInstance(data.payment_method);
        paymentTransaction.paymentProvider = PaymentProvider.getInstance(data.payment_provider);
        paymentTransaction.sharedReference = data.shared_reference;
        paymentTransaction.totalPaymentAmount = data.total_payment_amount;
        paymentTransaction.totalPaymentAmountFormatted = data.total_payment_amount_formatted;
        paymentTransaction.totalPaymentAmountCurrencyPrefixed = data.total_payment_amount_currency_prefixed;
        paymentTransaction.createdAt = data.created_at;
        paymentTransaction.updatedAt = data.updated_at;
        paymentTransaction.customerConfirmedPayment = data.customer_confirmed_payment;
        if (data.state) {
            paymentTransaction.state = PaymentTransactionState.getInstance(data.state);
        }
        if (data.client_payment_account) {
            paymentTransaction.clientPaymentAccount = ClientPaymentAccount.getInstance(data.client_payment_account);
        }

        return paymentTransaction;
    }
}

export default PaymentTransaction;