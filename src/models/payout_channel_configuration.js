class PayoutChannelConfiguration {
    /**
     * @type {String|null}
     */
    recipientType = null;

    /**
     * @type {boolean}
     */
    askForMiddleName = false;

    static getInstance(data) {
        const payoutChannelConfiguration = new PayoutChannelConfiguration();
        payoutChannelConfiguration.recipientType = data.recipient_type ?? null;
        payoutChannelConfiguration.askForMiddleName = data.ask_for_middle_name ?? false;
        return payoutChannelConfiguration;
    }
}

export default PayoutChannelConfiguration;