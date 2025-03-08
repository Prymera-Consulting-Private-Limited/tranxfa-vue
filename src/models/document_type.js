class DocumentType {
    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {String|null}
     */
    code = null;

    /**
     * @type {String|null}
     */
    title = null;

    /**
     * @type {String|null}
     */
    description = null;

    static getInstance(data) {
        const type = new DocumentType();
        type.id = data.id;
        type.code = data.code;
        type.title = data.title;
        type.description = data.description;
        return type;
    }
}

export default DocumentType;