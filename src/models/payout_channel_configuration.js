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

    /**
     * @type {Array}
     */
    nameLookupRequirements = [];

    static getInstance(data) {
        const payoutChannelConfiguration = new PayoutChannelConfiguration();
        payoutChannelConfiguration.recipientType = data.recipient_type ?? null;
        payoutChannelConfiguration.confirmAccountNumber = data.confirm_account_number ?? false;
        payoutChannelConfiguration.nameLookupRequirements = data.name_lookup_requirements ?? [];
        return payoutChannelConfiguration;
    }
}

export default PayoutChannelConfiguration;