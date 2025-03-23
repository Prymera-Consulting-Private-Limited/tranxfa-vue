import PaymentProvider from "@/models/payment_provider.js";

class PaymentMethod {
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
     * @type {PaymentProvider[]}
     */
    providers = [];

    static getInstance(data) {
        const paymentMethod = new PaymentMethod();
        paymentMethod.id = data.id;
        paymentMethod.code = data.code;
        paymentMethod.title = data.title;
        paymentMethod.description = data.description;
        if (data.providers?.length > 0) {
            paymentMethod.providers = data.providers.map((provider) => {
                return PaymentProvider.getInstance(provider);
            });
        }
        return paymentMethod;
    }
}

export default PaymentMethod;