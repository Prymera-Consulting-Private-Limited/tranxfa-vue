class HotelPhoto {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * Still carries the supplier's {size} placeholder, so it has to go through
     * getPhotoUrl before it can be requested.
     *
     * @type {string|null}
     */
    url = null;

    /**
     * @type {string|null}
     */
    caption = null;

    /**
     * @type {number}
     */
    sortOrder = 0;

    static getInstance(data) {
        const photo = new HotelPhoto();

        photo.id = data.id;
        photo.url = data.url;
        photo.caption = data.caption;
        photo.sortOrder = data.sort_order ?? 0;

        return photo;
    }

    /**
     * The supplier's sort order is its own gallery order and does not start at
     * zero, so the list is sorted rather than trusted as it arrives.
     *
     * @param {Array} data
     * @returns {HotelPhoto[]}
     */
    static getCollection(data) {
        return data
            .map(item => HotelPhoto.getInstance(item))
            .filter(photo => photo.url !== null)
            .sort((a, b) => a.sortOrder - b.sortOrder);
    }
}

export default HotelPhoto;
