class PayoutChannelConfiguration {
    /**
     * @type {String|null}
     */
    recipientType = null;

    static getInstance(data) {
        const payoutChannelConfiguration = new PayoutChannelConfiguration();
        payoutChannelConfiguration.recipientType = data.recipient_type ?? null;
        return payoutChannelConfiguration;
    }
}

export default PayoutChannelConfiguration;