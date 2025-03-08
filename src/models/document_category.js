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

    /**
     * @type {DocumentType[]}
     * @description List of document types that belong to this category
     */
    documentTypes = [];

    static getInstance(data) {
        const category = new DocumentCategory();
        category.id = data.id;
        category.code = data.code;
        category.title = data.title;
        category.description = data.description;
        if (data.document_types) {
            category.documentTypes = data.document_types.map((data) => DocumentType.getInstance(data))
        }
        return category;
    }
}

export default DocumentCategory;