class SubDeliveryOption {
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
        const subDeliveryOption = new SubDeliveryOption();
        subDeliveryOption.id = data.id;
        subDeliveryOption.code = data.code;
        subDeliveryOption.title = data.title;
        return subDeliveryOption;
    }
}

export default SubDeliveryOption;