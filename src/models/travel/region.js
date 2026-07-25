import Country from "@/models/country.js";

class Region {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {string|null}
     */
    name = null;

    /**
     * @type {string|null}
     */
    about = null;

    /**
     * @type {boolean}
     */
    featured = false;

    /**
     * @type {boolean}
     */
    popular = false;

    /**
     * @type {string|null}
     */
    image = null;

    /**
     * @type {string|null}
     */
    slug = null;

    /**
     * Only set for regions that map to an airport city, e.g. "DXB".
     *
     * @type {string|null}
     */
    iata = null;

    /**
     * e.g. "City", "Province", "Multi-City (vicinity)".
     *
     * @type {string|null}
     */
    regionType = null;

    /**
     * @type {Country|null}
     */
    country = null;

    /**
     * @type {number}
     */
    hotelsCount = 0;

    static getInstance(data) {
        const region = new Region();

        region.id = data.id;
        region.name = data.name;
        region.about = data.about;
        region.featured = data.featured ?? false;
        region.popular = data.popular ?? false;
        region.image = data.image;
        region.slug = data.slug;
        region.iata = data.iata;
        region.regionType = data.region_type;
        region.hotelsCount = data.hotels_count ?? 0;

        if (data.country) {
            region.country = Country.getInstance(data.country);
        }

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
