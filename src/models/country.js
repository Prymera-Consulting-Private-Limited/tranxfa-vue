class Country {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {string|null}
     */
    iso2Alpha = null;

    /**
     * @type {string|null}
     */
    iso3Alpha = null;

    /**
     * @type {string|null}
     */
    isoNumeric = null;

    /**
     * @type {string|null}
     */
    fipsCode = null;

    /**
     * @type {string|null}
     */
    callingCode = null;

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
    endonym = null;

    /**
     * @type {string|null}
     */
    demonym = null;

    static getInstance(data) {
        const country = new Country();
        country.id = data.id;
        country.iso2Alpha = data.iso2_alpha;
        country.iso3Alpha = data.iso3_alpha;
        country.isoNumeric = data.iso_numeric;
        country.fipsCode = data.fips_code;
        country.slug = data.slug;
        country.callingCode = data.calling_code;
        country.commonName = data.common_name;
        country.officialName = data.official_name;
        country.endonym = data.endonym;
        country.demonym = data.demonym;
        return country;
    }
}

export default Country;