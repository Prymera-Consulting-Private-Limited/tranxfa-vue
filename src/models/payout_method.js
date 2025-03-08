import PayoutChannel from "@/models/payout_channel.js";

class PayoutMethod {
    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {String|null}
     */
    code = null;

    /**
     * @type {String|null}
     */
    title = null;

    /**
     * @type {String|null}
     */
    description = null;

    /**
     * @type {String|null}
     */
    iconUri = null

    /**
     * @type {PayoutChannel|null}
     */
    channel = null

    static getInstance(data) {
        const payoutMethod = new PayoutMethod();
        payoutMethod.id = data.id;
        payoutMethod.code = data.code;
        payoutMethod.title = data.title;
        payoutMethod.description = data.description;
        payoutMethod.iconUri = data.icon_uri;
        if (data.channel) {
            payoutMethod.channel = PayoutChannel.getInstance(data.channel);
        }
        return payoutMethod;
    }
}

export default PayoutMethod;