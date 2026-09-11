class HotelFacility {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * The supplier leaves this null on facilities it only knows by group.
     *
     * @type {string|null}
     */
    name = null;

    /**
     * e.g. "General", "Meals", "Business".
     *
     * @type {string|null}
     */
    group = null;

    /**
     * @type {boolean}
     */
    isPaid = false;

    static getInstance(data) {
        const facility = new HotelFacility();

        facility.id = data.id;
        facility.name = data.name;
        facility.group = data.group;
        facility.isPaid = data.is_paid ?? false;

        return facility;
    }

    /**
     * @param {Array} data
     * @returns {HotelFacility[]}
     */
    static getCollection(data) {
        return data.map(item => HotelFacility.getInstance(item));
    }
}

export default HotelFacility;
