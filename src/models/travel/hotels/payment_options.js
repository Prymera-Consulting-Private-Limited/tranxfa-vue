import PaymentType from "@/models/travel/hotels/payment_type.js";

class PaymentOptions {
    /**
     * @type {PaymentType[]}
     */
    paymentTypes = [];

    static getInstance(data) {
        const paymentOptions = new PaymentOptions();

        if (Array.isArray(data.payment_types)) {
            paymentOptions.paymentTypes = data.payment_types.map(paymentType =>
                PaymentType.getInstance(paymentType)
            );
        }

        return paymentOptions;
    }
}

export default PaymentOptions;