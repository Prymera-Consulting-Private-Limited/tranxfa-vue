class PayoutChannelConfiguration {
    /**
     * @type {String|null}
     */
    recipientType = null;

    /**
     *
     * @type {boolean}
     */
    confirmAccountNumber = false;

    static getInstance(data) {
        const payoutChannelConfiguration = new PayoutChannelConfiguration();
        payoutChannelConfiguration.recipientType = data.recipient_type ?? null;
        payoutChannelConfiguration.confirmAccountNumber = data.confirm_account_number ?? false;
        return payoutChannelConfiguration;
    }
}

export default PayoutChannelConfiguration;