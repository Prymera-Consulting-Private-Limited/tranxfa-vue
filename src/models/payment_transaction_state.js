class PaymentTransactionState {

    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {String|null}
     */
    code = null;

    /**
     * @type {String|null}
     */
    colorScheme = null;

    static getInstance(data) {
        const paymentTransactionState = new PaymentTransactionState();
        paymentTransactionState.id = data.id;
        paymentTransactionState.code = data.code;
        paymentTransactionState.colorScheme = data.color_scheme;

        return paymentTransactionState;
    }
}

export default PaymentTransactionState;