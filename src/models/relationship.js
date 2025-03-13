class Relationship {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {string|null}
     */
    code = null;

    /**
     * @type {string|null}
     */
    title = null;

    /**
     * @type {string|null}
     */
    description = null;

    static getInstance(data) {
        const relationship = new Relationship();
        relationship.id = data.id;
        relationship.code = data.code;
        relationship.title = data.title;
        relationship.description = data.description;
        return relationship
    }
}

export default Relationship;