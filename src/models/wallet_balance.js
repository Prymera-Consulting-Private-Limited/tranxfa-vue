class WalletBalance {
    /**
     * @type {String|null}
     */
    currency = null;

    /**
     * @type {String|null}
     */
    amount = null;

    /**
     * @type {String|null}
     */
    amountFormatted = null;

    static getInstance(data) {
        const balance = new WalletBalance();
        balance.currency = data.currency;
        balance.amount = data.amount;
        balance.amountFormatted = data.amount_formatted;
        return balance;
    }
}

export default WalletBalance;
