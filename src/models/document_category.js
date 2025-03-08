class DocumentCategory {
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
        const category = new DocumentCategory();
        category.id = data.id;
        category.code = data.code;
        category.title = data.title;
        category.description = data.description;
        return category;
    }
}

export default DocumentCategory;