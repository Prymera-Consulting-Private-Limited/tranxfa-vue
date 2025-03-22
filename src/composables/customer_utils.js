import Customer from "@/models/customer.js";
import {useCustomerStore} from "@/stores/customer.js";
import axios from "axios";

export function useCustomerUtils() {
    const customerStore = useCustomerStore();

    /**
     * @type {{data: Customer|null}}
     */
    const customer = customerStore.customer;

    function updateStore(data, storeLocally = false) {
        customerStore.customer.data = Customer.getInstance(data);
        customerStore.isLoaded = true;
        if (storeLocally) {
            localStorage.setItem('customerSessionToken', customer.data?.session?.sessionToken);
        }
    }

    function getAuthToken() {
        return customer.data?.session?.sessionToken || localStorage.getItem('customerSessionToken');
    }

    async function register(email, password, confirmPassword) {
        await axios.post('/client/v1/signup', {
            email: email,
            password: password,
            confirm_password: confirmPassword,
        }).then((response) => {
            updateStore(response.data, true);
        });
    }

    async function login(email, password) {
        await axios.post('/client/v1/login', {
            email: email,
            password: password,
        }).then((response) => {
            updateStore(response.data, true);
        })
    }

    async function logout() {
        await axios.post('/client/v1/logout', {}, {
            headers: {
                'X-Customer-Token': getAuthToken(),
            }
        }).then(() => {
            customerStore.customer.data = null;
            customerStore.isLoaded = false;
            localStorage.removeItem('customerSessionToken');
        })
    }

    async function refresh() {
        return axios.get('/client/v1/profile', {
            headers: {
                'X-Customer-Token': getAuthToken(),
            }
        }).then((response) => {
            updateStore(response.data);
        })
    }

    async function resendEmailVerification() {
        await axios.post('/client/v1/resend-email-verification', {}, {
            headers: {
                'X-Customer-Token': getAuthToken(),
            }
        })
    }

    async function verifyEmail(otp) {
        await axios.post('/client/v1/verify-email-address', {
            otp: otp,
        }, {
            headers: {
                'X-Customer-Token': getAuthToken(),
            }
        }).then((response) => {
            updateStore(response.data);
        })
    }

    async function updateCountry(country) {
        await axios.post('/client/v1/update-country', {
            country_id: country.id,
        }, {
            headers: {
                'X-Customer-Token': getAuthToken(),
            }
        }).then((response) => {
            updateStore(response.data);
        })
    }

    async function updateProfileAttribute(data, categories) {
        const requestData = {};
        for (const attr of Object.keys(data)) {
            const unzipped = attr.split('.');
            if (unzipped.length === 1) {
                requestData[attr] = data[attr];
            } else {
                requestData[unzipped[0]] = requestData[unzipped[0]] || {};
                requestData[unzipped[0]][unzipped[1]] = data[attr];
            }
        }

        await axios.post(`/client/v1/update?category=${categories}`, requestData, {
            headers: {
                'X-Customer-Token': getAuthToken(),
            }
        }).then((response) => {
            updateStore(response.data);
        })
    }

    async function updateMobileNumber(country, number) {
        await axios.post('/client/v1/update-mobile-number', {
            mobile_number_country_id: country,
            mobile_number: number,
        }, {
            headers: {
                'X-Customer-Token': getAuthToken(),
            }
        }).then((response) => {
            updateStore(response.data);
        })
    }

    async function getAccountVerificationToken(documentCategory, documentType, file = null) {
        return axios.get(`/client/v1/account-verification/token/${documentCategory.id}/${documentType.id}`, {
            params: file ? {
                file_name: file.name,
                file_type: file.type,
            } : null,
            headers: {
                'X-Customer-Token': getAuthToken(),
            }
        });
    }

    async function getLivelinessToken(api) {
        return axios.get(`/client/v1/account-verification/liveliness-token`, {
            params: {
                api: api,
            },
            headers: {
                'X-Customer-Token': getAuthToken(),
            }
        });
    }

    async function uploadDocument(documentCategory, documentType, pages = []) {
        const data = {
            pages: pages,
        }
        return axios.post(`/client/v1/document/upload`, data, {
            params: {
                document_category_id: documentCategory.id,
                document_type_id: documentType.id,
            },
            headers: {
                'X-Customer-Token': getAuthToken(),
            }
        });
    }

    return {
        getAuthToken,
        register,
        login,
        refresh,
        resendEmailVerification,
        verifyEmail,
        updateCountry,
        updateProfileAttribute,
        updateMobileNumber,
        logout,
        getAccountVerificationToken,
        getLivelinessToken,
        uploadDocument,
    }
}