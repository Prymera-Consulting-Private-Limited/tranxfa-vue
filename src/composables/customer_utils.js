import Account from "@/models/account.js";
import Session from "@/models/session.js";
import Country from "@/models/country.js";
import Customer from "@/models/customer.js";
import CustomerAddress from "@/models/customer_address.js";
import CustomerAttribute from "@/models/customer_attribute.js";
import {inject} from "vue";
import {useCustomerStore} from "@/stores/customer.js";

export function useCustomerUtils() {
    const customer = new Customer()
    const $axios = inject('axios')
    const customerStore = useCustomerStore();

    function getObject(data) {
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
            const account = new Account();
            account.email = data.account.email;
            account.isEmailVerified = data.account.is_email_verified;
            account.passwordChangedAt = data.account.password_changed_at;
            account.createdAt = data.account.created_at;
            account.updatedAt = data.account.updated_at;
            customer.account = account;
        }
        if (data.session) {
            const session = new Session();
            session.id = data.session.id;
            session.isMfaCompleted = data.session.is_mfa_completed;
            session.sessionToken = data.session.session_token;
            session.mfaMethod = data.session.mfa_method;
            session.clientVersion = data.session.client_version;
            session.osVersion = data.session.os_version;
            session.touchedAt = data.session.touched_at;
            session.createdAt = data.session.created_at;
            session.updatedAt = data.session.updated_at;
            customer.session = session;
        }
        if (data.mobile_number_country) {
            const mobileNumberCountry = new Country();
            mobileNumberCountry.id = data.mobile_number_country.id;
            mobileNumberCountry.iso2Alpha = data.mobile_number_country.iso2_alpha;
            mobileNumberCountry.iso3Alpha = data.mobile_number_country.iso3_alpha;
            mobileNumberCountry.isoNumeric = data.mobile_number_country.iso_numeric;
            mobileNumberCountry.fipsCode = data.mobile_number_country.fips_code;
            mobileNumberCountry.slug = data.mobile_number_country.slug;
            mobileNumberCountry.callingCode = data.mobile_number_country.calling_code;
            mobileNumberCountry.commonName = data.mobile_number_country.common_name;
            mobileNumberCountry.officialName = data.mobile_number_country.official_name;
            mobileNumberCountry.endonym = data.mobile_number_country.endonym;
            mobileNumberCountry.demonym = data.mobile_number_country.demonym;
            customer.mobileNumberCountry = mobileNumberCountry;
        }
        if (data.country) {
            const country = new Country();
            country.id = data.country.id;
            country.iso2Alpha = data.country.iso2_alpha;
            country.iso3Alpha = data.country.iso3_alpha;
            country.isoNumeric = data.country.iso_numeric;
            country.fipsCode = data.country.fips_code;
            country.slug = data.country.slug;
            country.callingCode = data.country.calling_code;
            country.commonName = data.country.common_name;
            country.officialName = data.country.official_name;
            country.endonym = data.country.endonym;
            country.demonym = data.country.demonym;
            customer.country = country;
        }
        if (data.nationality) {
            const nationality = new Country();
            nationality.id = data.nationality.id;
            nationality.iso2Alpha = data.nationality.iso2_alpha;
            nationality.iso3Alpha = data.nationality.iso3_alpha;
            nationality.isoNumeric = data.nationality.iso_numeric;
            nationality.fipsCode = data.nationality.fips_code;
            nationality.slug = data.nationality.slug;
            nationality.callingCode = data.nationality.calling_code;
            nationality.commonName = data.nationality.common_name;
            nationality.officialName = data.nationality.official_name;
            nationality.endonym = data.nationality.endonym;
            nationality.demonym = data.nationality.demonym;
            customer.nationality = nationality;
        }
        if (data.address) {
            const address = new CustomerAddress();
            address.addressLine1 = data.address.address_line_1;
            address.addressLine2 = data.address.address_line_2;
            address.city = data.address.city;
            address.postcode = data.address.postcode;
            address.region = data.address.region;
            address.createdAt = data.address.created_at;
            address.updatedAt = data.address.updated_at;
            customer.address = address;
        }
        if (data.attributes && data.attributes.length > 0) {
            let attributes = [];
            for (const attribute of data.attributes) {
                const attr = new CustomerAttribute();
                attr.attribute = attribute.attribute;
                attr.category = attribute.category;
                attr.regularExpression = attribute.regular_expression;
                attr.mask = attribute.mask;
                attr.expressionErrorMessage = attribute.expression_error_message;
                attr.label = attribute.label;
                attr.infoText = attribute.info_text;
                attr.isRequired = attribute.is_required;
                attr.value = attribute.value;
                attributes.push(attr);
            }

            customer.attributes = attributes;
        }
    }

    async function refresh() {
        $axios.get('/client/v1/profile', {
            headers: {
                'X-Customer-Token': localStorage.getItem('customerSessionToken'),
            }
        }).then((response) => {
            getObject(response.data);
            customerStore.customer = customer;
            customerStore.isLoaded = true;
        }).catch(() => {

        })
    }

    async function verifyEmail(otp) {
        await $axios.post('/client/v1/verify-email-address', {
            otp: otp,
        }, {
            headers: {
                'X-Customer-Token': customerStore.customer?.session?.sessionToken || localStorage.getItem('customerSessionToken'),
            }
        }).then((response) => {
            getObject(response.data);
            customerStore.customer = customer;
            customerStore.isLoaded = true;
        }).catch((e) => {
            throw e;
        })
    }

    async function updateProfileIdentity(attributes) {
        const data = {};
        for (const attr of attributes.value) {
            const parsedAttr = attr.attribute.split('.');
            if (parsedAttr.length === 1) {
                data[attr.attribute] = attr.value;
            } else {
                data[parsedAttr[0]] = {};
                data[parsedAttr[0]][parsedAttr[1]] = attr.value;
            }
        }

        await $axios.post('/client/v1/update?category=identity', data, {
            headers: {
                'X-Customer-Token': localStorage.getItem('customerSessionToken'),
            }
        }).then((response) => {
            getObject(response.data);
            customerStore.customer = customer;
            customerStore.isLoaded = true;
        }).catch((e) => {
            throw e;
        })
    }

    return {
        customer,
        getObject,
        refresh,
        verifyEmail,
        updateProfileIdentity,
    }
}