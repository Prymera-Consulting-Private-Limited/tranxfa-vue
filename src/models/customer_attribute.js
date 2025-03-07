class CustomerAttribute {
    /**
     * @type {string|null}
     */
    attribute = null;

    /**
     * @type {string|null}
     */
    category = null;

    /**
     * @type {string|null}
     */
    regularExpression = null;

    /**
     * @type {string|null}
     */
    mask = null;

    /**
     * @type {string|null}
     */
    expressionErrorMessage = null;

    /**
     * @type {string|null}
     */
    label = null;

    /**
     * @type {string|null}
     */
    infoText = null;

    /**
     * @type {boolean|null}
     */
    isRequired = null;

    /**
     * @type {string|null}
     */
    value = null;

    static getInstance(data) {
        const attribute = new CustomerAttribute();
        attribute.attribute = data.attribute;
        attribute.category = data.category;
        attribute.regularExpression = data.regular_expression;
        attribute.mask = data.mask;
        attribute.expressionErrorMessage = data.expression_error_message;
        attribute.label = data.label;
        attribute.infoText = data.info_text;
        attribute.isRequired = data.is_required;
        attribute.value = data.value;
        return attribute;
    }
}

export default CustomerAttribute;