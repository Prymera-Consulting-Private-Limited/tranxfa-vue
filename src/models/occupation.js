class Occupation {
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
        const occupation = new Occupation();
        occupation.id = data.id;
        occupation.code = data.code;
        occupation.title = data.title;
        occupation.description = data.description;
        return occupation
    }
}

export default Occupation;