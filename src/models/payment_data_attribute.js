class PaymentDataAttribute {
    /**
     * @type {String|null}
     */
    attribute = null;

    /**
     * @type {String|null}
     */
    type = null;

    /**
     * @type {String|null}
     */
    label = null;

    /**
     * @type {String|null}
     */
    info = null;

    /**
     * @type {String|null}
     */
    value = null;

    /**
     * @type {String|null}
     */
    inputMode = null;

    /**
     * @type {Boolean|null}
     */
    isRequired = null;

    static getInstance(data) {
        const attribute = new PaymentDataAttribute();
        attribute.attribute = data.attribute;
        attribute.type = data.type;
        attribute.label = data.label;
        attribute.inputMode = data.input_mode;
        attribute.isRequired = data.is_required;
        attribute.info = data.info;
        attribute.value = data.value;
        return attribute;
    }
}

export default PaymentDataAttribute;