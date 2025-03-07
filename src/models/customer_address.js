class CustomerAddress {
    /**
     * @type {string|null}
     */
    addressLine1 = null;

    /**
     * @type {string|null}
     */
    addressLine2 = null;

    /**
     * @type {string|null}
     */
    city = null;

    /**
     * @type {string|null}
     */
    postcode = null;

    /**
     * @type {string|null}
     */
    region = null;

    /**
     * @type {string|null}
     */
    createdAt = null;

    /**
     * @type {string|null}
     */
    updatedAt = null;

    static getInstance(data) {
        const address = new CustomerAddress();
        address.addressLine1 = data.address_line_1;
        address.addressLine2 = data.address_line_2;
        address.city = data.city;
        address.postcode = data.postcode;
        address.region = data.region;
        address.createdAt = data.created_at;
        address.updatedAt = data.updated_at;
        return address;
    }
}

export default CustomerAddress;