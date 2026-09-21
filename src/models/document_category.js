import DocumentType from "@/models/document_type.js";

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

    /**
     * @type {Boolean|null}
     * @description Whether the customer will really be asked for this category.
     * Null when the console did not say, which is not the same as false: a
     * console older than SD-1223 sends nothing, and nothing should be hidden.
     */
    isRequired = null;

    static getInstance(data) {
        const category = new DocumentCategory();
        category.id = data.id;
        category.code = data.code;
        category.title = data.title;
        category.description = data.description;
        category.isRequired = data.required ?? null;
        if (data.document_types) {
            category.documentTypes = data.document_types.map((data) => DocumentType.getInstance(data))
        }
        return category;
    }
}

export default DocumentCategory;