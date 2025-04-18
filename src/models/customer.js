import Account from "@/models/account.js";
import Session from "@/models/session.js";
import Country from "@/models/country.js";
import CustomerAddress from "@/models/customer_address.js";
import CustomerAttribute from "@/models/customer_attribute.js";
import CustomerDocument from "@/models/customer_document.js";
import DocumentCategory from "@/models/document_category.js";
import CustomerAttributeCategory from "@/enums/customer_attribute_category.js";

export class Customer {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {number|null}
     */
    crn = null;

    /**
     * @type {string|null}
     */
    name = null;

    /**
     * @type {string|null}
     */
    secondName = null;

    /**
     * @type {string|null}
     */
    thirdName = null;

    /**
     * @type {string|null}
     */
    wholeName = null;

    /**
     * @type {string|null}
     */
    uniqueIdentityNumber = null;

    /**
     * @type {string|null}
     */
    createdAt = null;

    /**
     * @type {string|null}
     */
    updatedAt = null;

    /**
     * @type {Account|null}
     */
    account = null;

    /**
     * @type {Session|null}
     */
    session = null;

    /**
     * @type {Country|null}
     */
    country = null;

    /**
     * @type {Country|null}
     */
    nationality = null;

    /**
     * @type {object|null}
     */
    address = null;

    /**
     * @type {object|null}
     */
    birthDetail = null;

    /**
     * @type {Array<CustomerAttribute>}
     */
    attributes = [];

    /**
     * @type {Array<CustomerDocument>}
     */
    documents = [];

    /**
     * @type {DocumentCategory[]}
     */
    pendingDocuments = [];

    identityInformationRequired () {
        if (this.country === null) {
            return true;
        }

        return Boolean(this.attributes.find((o) => o.category === CustomerAttributeCategory.IDENTITY && o.isRequired && !o.value))
    }

    addressInformationRequired () {
        if (this.country === null) {
            return true;
        }

        return Boolean(this.attributes.find((o) => o.category === CustomerAttributeCategory.ADDRESS && o.isRequired && !o.value))
    }

    employmentInformationRequired () {
        if (this.country === null) {
            return true;
        }

        return Boolean(this.attributes.find((o) => o.category === CustomerAttributeCategory.EMPLOYMENT && o.isRequired && !o.value))
    }

    static getInstance(data) {
        const customer = new Customer();
        customer.id = data.id;
        customer.crn = data.crn;
        customer.name = data.name;
        customer.secondName = data.second_name;
        customer.thirdName = data.third_name;
        customer.wholeName = data.whole_name;
        customer.uniqueIdentityNumber = data.unique_identity_number;
        customer.createdAt = data.created_at;
        customer.updatedAt = data.updated_at;
        if (data.account) {
            customer.account = Account.getInstance(data.account);
        }
        if (data.session) {
            customer.session = Session.getInstance(data.session);
        }
        if (data.country) {
            customer.country = Country.getInstance(data.country);
        }
        if (data.nationality) {
            customer.nationality = Country.getInstance(data.nationality);
        }
        if (data.address) {
            customer.address = CustomerAddress.getInstance(data.address);
        }
        if (data.attributes && data.attributes.length > 0) {
            customer.attributes = data.attributes.map((attribute) => CustomerAttribute.getInstance(attribute));
        }
        if (data.documents && data.documents.length > 0) {
            customer.documents = data.documents.map((document) => CustomerDocument.getInstance(document));
        }
        if (data.pending_documents && data.pending_documents.length > 0) {
            customer.pendingDocuments = data.pending_documents.map((category) => DocumentCategory.getInstance(category));
        }
        return customer;
    }
}

export default Customer;