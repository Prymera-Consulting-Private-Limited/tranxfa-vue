class RoomExtension {
    /**
     * @type {number|null}
     */
    class = null;

    /**
     * @type {number|null}
     */
    quality = null;

    /**
     * @type {number|null}
     */
    sex = null;

    /**
     * @type {number|null}
     */
    bathroom = null;

    /**
     * @type {number|null}
     */
    bedding = null;

    /**
     * @type {number|null}
     */
    family = null;

    /**
     * @type {number|null}
     */
    capacity = null;

    /**
     * @type {number|null}
     */
    club = null;

    /**
     * @type {number|null}
     */
    bedrooms = null;

    /**
     * @type {number|null}
     */
    balcony = null;

    /**
     * @type {number|null}
     */
    view = null;

    /**
     * @type {number|null}
     */
    floor = null;

    static getInstance(data) {
        const roomExtension = new RoomExtension();

        roomExtension.class = data.class;
        roomExtension.quality = data.quality;
        roomExtension.sex = data.sex;
        roomExtension.bathroom = data.bathroom;
        roomExtension.bedding = data.bedding;
        roomExtension.family = data.family;
        roomExtension.capacity = data.capacity;
        roomExtension.club = data.club;
        roomExtension.bedrooms = data.bedrooms;
        roomExtension.balcony = data.balcony;
        roomExtension.view = data.view;
        roomExtension.floor = data.floor;

        return roomExtension;
    }
}

export default RoomExtension;