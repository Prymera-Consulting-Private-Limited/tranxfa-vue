class WalletSubscription {
    /**
     * @type {String|null}
     */
    walletNumber = null;

    /**
     * @type {String|null}
     */
    status = null;

    /**
     * @type {String|null}
     */
    enrolledAt = null;

    /**
     * @type {String|null}
     */
    closedAt = null;

    /**
     * @type {Boolean}
     */
    reacceptanceRequired = false;

    static getInstance(data) {
        const subscription = new WalletSubscription();
        subscription.walletNumber = data.wallet_number;
        subscription.status = data.status;
        subscription.enrolledAt = data.enrolled_at;
        subscription.closedAt = data.closed_at;
        subscription.reacceptanceRequired = data.reacceptance_required === true;
        return subscription;
    }
}

export default WalletSubscription;
