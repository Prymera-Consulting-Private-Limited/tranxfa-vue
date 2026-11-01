class PayoutTransactionState {

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
        const payoutTransactionState = new PayoutTransactionState();
        payoutTransactionState.id = data.id;
        payoutTransactionState.code = data.code;
        payoutTransactionState.colorScheme = data.color_scheme;

        return payoutTransactionState;
    }
}

export default PayoutTransactionState;