class DeliveryOption {
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

    static getInstance(data) {
        const deliveryOption = new DeliveryOption();
        deliveryOption.id = data.id;
        deliveryOption.code = data.code;
        deliveryOption.title = data.title;
        return deliveryOption;
    }
}

export default DeliveryOption;