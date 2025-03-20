class TransactionState {
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
    label = null;

    /**
     * @type {String|null}
     */
    description = null;

    /**
     * @type {String|null}
     */
    progress = null;

    /**
     * @type {String|null}
     */
    colorScheme = null;

    static getInstance(data) {
        const transactionState = new TransactionState();
        transactionState.id = data.id;
        transactionState.code = data.code;
        transactionState.label = data.label;
        transactionState.description = data.description;
        transactionState.progress = data.progress;
        transactionState.colorScheme = data.color_scheme;

        return transactionState;
    }
}

export default TransactionState;