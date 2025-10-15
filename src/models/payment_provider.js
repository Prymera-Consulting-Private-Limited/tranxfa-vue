import PaymentDataAttribute from "@/models/payment_data_attribute.js";

class PaymentProvider {
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
     * @type {PaymentDataAttribute[]}
     */
    paymentDataAttributes = [];

    static getInstance(data) {
        const paymentProvider = new PaymentProvider();
        paymentProvider.id = data.id;
        paymentProvider.code = data.code;
        paymentProvider.title = data.title;
        paymentProvider.description = data.description;
        if (data.payment_data_requirements?.length > 0) {
            paymentProvider.paymentDataAttributes = data.payment_data_requirements.map((o) => PaymentDataAttribute.getInstance(o));
        }
        return paymentProvider;
    }
}

export default PaymentProvider;