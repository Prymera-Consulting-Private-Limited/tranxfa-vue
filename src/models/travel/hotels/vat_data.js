class VatData {
    /**
     * @type {boolean|null}
     */
    included = null;

    /**
     * @type {boolean|null}
     */
    applied = null;

    /**
     * @type {string|null}
     */
    amount = null;

    /**
     * @type {string|null}
     */
    currencyCode = null;

    /**
     * @type {string|null}
     */
    value = null;

    static getInstance(data) {
        const vatData = new VatData();

        vatData.included = data.included;
        vatData.applied = data.applied;
        vatData.amount = data.amount;
        vatData.currencyCode = data.currency_code;
        vatData.value = data.value;

        return vatData;
    }
}

export default VatData;