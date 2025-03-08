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

    /**
     * @type {Boolean}
     */
    publicUpload = false;

    /**
     * @type {String|null}
     */
    info = null;

    /**
     * @type {String|null}
     */
    documentNumberLabel = null;

    /**
     * @type {String|null}
     */
    api = null;

    static getInstance(data) {
        const type = new DocumentType();
        type.id = data.id;
        type.code = data.code;
        type.title = data.title;
        type.description = data.description;
        type.publicUpload = data?.public_upload ?? false;
        type.info = data?.info;
        type.documentNumberLabel = data?.document_number_label;
        type.api = data?.api;
        return type;
    }
}

export default DocumentType;