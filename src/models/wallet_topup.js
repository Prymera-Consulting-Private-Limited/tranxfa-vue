class WalletTopup {
    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {String|null}
     */
    status = null;

    /**
     * @type {String|null}
     */
    reference = null;

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

    /**
     * @type {String|null}
     */
    expiresAt = null;

    /**
     * @type {String|null}
     */
    receivedAt = null;

    /**
     * @type {String|null}
     */
    createdAt = null;

    /**
     * @returns {Boolean}
     */
    isPending() {
        return this.status === 'pending';
    }

    static getInstance(data) {
        const topup = new WalletTopup();
        topup.id = data.id;
        topup.status = data.status;
        topup.reference = data.reference;
        topup.currency = data.currency;
        topup.amount = data.amount;
        topup.amountFormatted = data.amount_formatted;
        topup.expiresAt = data.expires_at;
        topup.receivedAt = data.received_at;
        topup.createdAt = data.created_at;
        return topup;
    }
}

export default WalletTopup;
