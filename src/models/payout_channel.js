import PayoutChannelConfiguration from "@/models/payout_channel_configuration.js";
import PayoutChannelAttribute from "@/models/payout_channel_attribute.js";
import Country from "@/models/country.js";
import Currency from "@/models/currency.js";
import PayoutMethod from "@/models/payout_method.js";

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

    /**
     * @type {Country|null}
     */
    country = null;

    /**
     * @type {Currency|null}
     */
    currency = null;

    /**
     * @type {PayoutMethod|null}
     */
    payoutMethod = null;

    static getInstance(data) {
        const payoutChannel = new PayoutChannel();
        payoutChannel.id = data.id;
        if (data.configuration) {
            payoutChannel.configuration = PayoutChannelConfiguration.getInstance(data.configuration);
        }
        if (data.country) {
            payoutChannel.country = Country.getInstance(data.country);
        }
        if (data.currency) {
            payoutChannel.currency = Currency.getInstance(data.currency);
        }
        if (data.payout_method) {
            payoutChannel.payoutMethod = PayoutMethod.getInstance(data.payout_method);
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