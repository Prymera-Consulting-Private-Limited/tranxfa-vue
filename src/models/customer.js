import Account from "@/models/account.js";
import Session from "@/models/session.js";
import Country from "@/models/country.js";
import CustomerAddress from "@/models/customer_address.js";
import CustomerAttribute from "@/models/customer_attribute.js";

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
    firstName = null;

    /**
     * @type {string|null}
     */
    middleName = null;

    /**
     * @type {string|null}
     */
    lastName = null;

    /**
     * @type {string|null}
     */
    fullName = null;

    /**
     * @type {string|null}
     */
    uniqueIdentityNumber = null;

    /**
     * @type {string|null}
     */
    mobileNumber = null;

    /**
     * @type {string|null}
     */
    createdAt = null;

    /**
     * @type {string|null}
     */
    updatedAt = null;

    /**
     * @type {Country|null}
     */
    mobileNumberCountry = null;

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

    identityInformationRequired () {
        return Boolean(this.attributes.find((o) => o.category === 'identity' && o.isRequired && !o.value))
    }

    static getInstance(data) {
        const customer = new Customer();
        customer.id = data.id;
        customer.crn = data.crn;
        customer.firstName = data.first_name;
        customer.middleName = data.middle_name;
        customer.lastName = data.last_name;
        customer.fullName = data.full_name;
        customer.uniqueIdentityNumber = data.unique_identity_number;
        customer.mobileNumber = data.mobile_number;
        customer.createdAt = data.created_at;
        customer.updatedAt = data.updated_at;
        if (data.account) {
            customer.account = Account.getInstance(data.account);
        }
        if (data.session) {
            customer.session = Session.getInstance(data.session);
        }
        if (data.mobile_number_country) {
            customer.mobileNumberCountry = Country.getInstance(data.mobile_number_country);
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
            let attributes = [];
            for (const attribute of data.attributes) {
                attributes.push(CustomerAttribute.getInstance(attribute));
            }

            customer.attributes = attributes;
        }
        return customer;
    }
}

export default Customer;