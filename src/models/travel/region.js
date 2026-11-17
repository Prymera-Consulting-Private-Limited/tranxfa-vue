/**
 * A destination the supplier actually covers. Anywhere it does not is left out of
 * the lookup entirely, so an empty result means "we cannot search there" rather
 * than "no such place".
 */
class Region {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {string|null}
     */
    slug = null;

    /**
     * @type {string|null}
     */
    name = null;

    /**
     * Our own code, whose display text comes from the response's labels. Null for
     * anything unrecognised, since calling a city an airport would send somebody
     * to the wrong place.
     *
     * @type {string|null}
     */
    kind = null;

    /**
     * A line the operator wrote about a curated destination, when there is one.
     *
     * @type {string|null}
     */
    about = null;

    /**
     * @type {string|null}
     */
    country = null;

    /**
     * @type {string|null}
     */
    countryCode = null;

    static getInstance(data) {
        const region = new Region();

        region.id = data.id;
        region.slug = data.slug;
        region.name = data.name;
        region.kind = data.kind ?? null;
        region.about = data.about ?? null;
        region.country = data.country ?? null;
        region.countryCode = data.country_code ?? null;

        return region;
    }

    /**
     * @param {Array} data
     * @returns {Region[]}
     */
    static getCollection(data) {
        return data.map(item => Region.getInstance(item));
    }
}

export default Region;
