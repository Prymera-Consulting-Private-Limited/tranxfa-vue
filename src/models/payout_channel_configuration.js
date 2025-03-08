import RecipientType from "@/enums/recipient_type.js";

class PayoutChannelConfiguration {
    /**
     * @type {RecipientType|null}
     */
    recipientType = null;

    /**
     * @type {boolean}
     */
    askForMiddleName = false;

    static getInstance(data) {
        const payoutChannelConfiguration = new PayoutChannelConfiguration();
        payoutChannelConfiguration.recipientType = RecipientType[data.recipient_type];
        payoutChannelConfiguration.askForMiddleName = data.ask_for_middle_name;
        return payoutChannelConfiguration;
    }
}

export default PayoutChannelConfiguration;