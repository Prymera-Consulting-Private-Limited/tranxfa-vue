class RecipientTransactionSummary {
    /**
     * @type {String|null}
     */
    firstTransactionAt = null;

    /**
     * @type {String|null}
     */
    recentTransactionAt = null;

    static getInstance(data) {
        const instance = new RecipientTransactionSummary();
        instance.firstTransactionAt = data.first_transaction_at;
        instance.recentTransactionAt = data.recent_transaction_at;
        return instance;
    }
}

export default RecipientTransactionSummary;