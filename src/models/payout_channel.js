import PayoutChannelConfiguration from "@/models/payout_channel_configuration.js";
import PayoutChannelAttribute from "@/models/payout_channel_attribute.js";

class PayoutChannel {
    /**
     * * @type {string|null}
     */
    id = null;

    /**
     * @type {PayoutChannelConfiguration|null}
     */
    configuration = null;

    /**
     * @type {PayoutChannelAttribute[]}
     */
    attributes = [];

    static getInstance(data) {
        const payoutChannel = new PayoutChannel();
        payoutChannel.id = data.id;
        if (data.configuration) {
            payoutChannel.configuration = PayoutChannelConfiguration.getInstance(data.configuration);
        }
        if (data.attributes) {
            payoutChannel.attributes = data.attributes.map((attribute) => {
                return PayoutChannelAttribute.getInstance(attribute);
            });
        }
        return payoutChannel;
    }
}

export default PayoutChannel;