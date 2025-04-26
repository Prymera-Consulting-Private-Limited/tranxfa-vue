class ClientPaymentAccountAttribute {
    /**
     * @type {String|null}
     */
    key= null;

    /**
     * @type {String|null}
     */
    value = null;

    static getInstance(data) {
        const attribute = new ClientPaymentAccountAttribute();
        attribute.key = data.key;
        attribute.value = data.value;
        return attribute;
    }
}

export default ClientPaymentAccountAttribute;