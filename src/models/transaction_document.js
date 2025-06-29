import DocumentCategory from "@/models/document_category.js";

class TransactionDocument {
    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {String|null}
     */
    createdAt = null;

    /**
     * @type {String|null}
     */
    updatedAt = null;

    /**
     * @type {DocumentCategory|null}
     */
    documentCategory = null;

    static getInstance(data) {
        const document = new TransactionDocument();
        document.id = data.id;
        document.createdAt = data.created_at;
        document.updatedAt = data.updated_at;
        document.documentCategory = DocumentCategory.getInstance(data.document_category);

        return document;
    }
}

export default TransactionDocument;