import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";

class QuotePendingDocument extends DocumentCategory {
    /**
     * @type {boolean}
     */
    isRequired = false;

    static getInstance(data) {
        const category = new QuotePendingDocument();
        category.id = data.id;
        category.code = data.code;
        category.title = data.title;
        category.description = data.description;
        category.isRequired = data.is_required;
        if (data.document_types) {
            category.documentTypes = data.document_types.map((data) => DocumentType.getInstance(data))
        }
        return category;
    }
}

export default QuotePendingDocument;