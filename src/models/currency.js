class Currency {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {int|null}
     */
    decimalPlaces = null;

    /**
     * @type {string|null}
     */
    isoNumeric = null;

    /**
     * @type {string|null}
     */
    isoAlpha = null;

    /**
     * @type {string|null}
     */
    currencyType = null;

    /**
     * @type {string|null}
     */
    commonName = null;

    /**
     * @type {string|null}
     */
    officialName = null;

    /**
     * @type {string|null}
     */
    cryptoCode = null;

    /**
     * @type {string|null}
     */
    code = null;

    /**
     * @type {string|null}
     */
    iconUnicode = null;

    static getInstance(data) {
        const currency = new Currency();
        currency.id = data.id;
        currency.decimalPlaces = data.decimal_places;
        currency.isoNumeric = data.iso_numeric;
        currency.isoAlpha = data.iso_alpha;
        currency.currencyType = data.type;
        currency.commonName = data.common_name;
        currency.officialName = data.official_name;
        currency.cryptoCode = data.crypto_code;
        currency.code = data.code;
        currency.iconUnicode = data.icon_unicode;
        return currency;
    }
}

export default Currency;