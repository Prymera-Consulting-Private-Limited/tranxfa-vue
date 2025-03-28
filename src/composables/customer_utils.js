import Customer from "@/models/customer.js";
import {useCustomerStore} from "@/stores/customer.js";
import axios from "axios";

export function useCustomerUtils() {
    const customerStore = useCustomerStore();

    function updateStore(data) {
        customerStore.customer.data = Customer.getInstance(data);
        customerStore.isLoaded = true;
    }

    async function register(email, password, confirmPassword) {
        await axios.post('/client/v1/signup', {
            email: email,
            password: password,
            confirm_password: confirmPassword,
        }).then((response) => {
            updateStore(response.data);
        });
    }

    async function login(email, password) {
        await axios.post('/client/v1/login', {
            email: email,
            password: password,
        }).then((response) => {
            updateStore(response.data);
        })
    }

    async function logout() {
        await axios.post('/client/v1/logout', {}).then(() => {
            customerStore.customer.data = null;
            customerStore.isLoaded = false;
        })
    }

    async function refresh() {
        return axios.get('/client/v1/profile').then((response) => {
            updateStore(response.data);
        })
    }

    async function resendEmailVerification() {
        await axios.post('/client/v1/resend-email-verification', {})
    }

    async function verifyEmail(otp) {
        await axios.post('/client/v1/verify-email-address', {
            otp: otp,
        }).then((response) => {
            updateStore(response.data);
        })
    }

    async function updateCountry(country) {
        await axios.post('/client/v1/update-country', {
            country_id: country.id,
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

        await axios.post(`/client/v1/update?category=${categories}`, requestData).then((response) => {
            updateStore(response.data);
        })
    }

    async function updateMobileNumber(country, number) {
        await axios.post('/client/v1/update-mobile-number', {
            mobile_number_country_id: country,
            mobile_number: number,
        }).then((response) => {
            updateStore(response.data);
        })
    }

    async function getAccountVerificationToken(documentCategory, documentType, file = null) {
        return axios.get(`/client/v1/account-verification/token/${documentCategory.id}/${documentType.id}`, {
            params: file ? {
                file_name: file.name,
                file_type: file.type,
            } : null
        });
    }

    async function getLivelinessToken(api) {
        return axios.get(`/client/v1/account-verification/liveliness-token`, {
            params: {
                api: api,
            },
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
        });
    }

    async function tasks() {
        return axios.get('/client/v1/tasks');
    }

    async function devices() {
        return axios.get('/client/v1/devices');
    }

    return {
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
        tasks,
        devices,
    }
}