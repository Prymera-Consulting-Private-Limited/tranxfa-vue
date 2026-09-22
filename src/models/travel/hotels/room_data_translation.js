class RoomDataTranslation {
    /**
     * @type {string|null}
     */
    mainRoomType = null;

    /**
     * @type {string|null}
     */
    mainName = null;

    /**
     * @type {string|null}
     */
    bathroom = null;

    /**
     * @type {string|null}
     */
    beddingType = null;

    /**
     * @type {string|null}
     */
    miscRoomType = null;

    /**
     * @type {Array}
     */
    beds = [];

    static getInstance(data) {
        const roomDataTranslation = new RoomDataTranslation();

        roomDataTranslation.mainRoomType = data.main_room_type;
        roomDataTranslation.mainName = data.main_name;
        roomDataTranslation.bathroom = data.bathroom;
        roomDataTranslation.beddingType = data.bedding_type;
        roomDataTranslation.miscRoomType = data.misc_room_type;
        roomDataTranslation.beds = data.beds ?? [];

        return roomDataTranslation;
    }
}

export default RoomDataTranslation;