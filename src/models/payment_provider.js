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

    static getInstance(data) {
        const paymentProvider = new PaymentProvider();
        paymentProvider.id = data.id;
        paymentProvider.code = data.code;
        paymentProvider.title = data.title;
        paymentProvider.description = data.description;
        return paymentProvider;
    }
}

export default PaymentProvider;