import KycDocumentStatus from "@/enums/kyc_document_status.js";
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";

class CustomerDocument {
    /**
     * @type {String|null}
     */
    id = null;

    /**
     * @type {DocumentCategory|null}
     */
    documentCategory = null;

    /**
     * @type {DocumentType|null}
     */
    documentType = null;

    /**
     * @type {KycDocumentStatus|null}
     */
    statusCode = null;

    /**
     * @type {String|null}
     */
    statusTitle = null;

    /**
     * @type {String|null}
     */
    createdAt = null

    /**
     * @type {String|null}
     */
    updatedAt = null;

    static getInstance(data) {
        const document = new CustomerDocument();
        document.id = data.id;
        if (data.document_category) {
            document.documentCategory = DocumentCategory.getInstance(data.document_category);
        }
        if (data.document_type) {
            document.documentType = DocumentType.getInstance(data.document_type);
        }
        document.statusCode = KycDocumentStatus[data.status_code];
        document.statusTitle = data.status_title;
        document.createdAt = data.created_at;
        document.updatedAt = data.updated_at;
        return document;
    }
}

export default CustomerDocument;