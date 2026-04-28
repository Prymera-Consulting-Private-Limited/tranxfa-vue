import Customer from "@/models/customer.js";
import {useCustomerStore} from "@/stores/customer.js";
import axios from "axios";

let refreshPromise = null;

function clientMobileAuthHeaders() {
    const token = import.meta.env.VITE_APP_CLIENT_TOKEN;
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}

function optionalFcmToken() {
    const t = import.meta.env.VITE_FCM_TOKEN;
    return t && String(t).length > 0 ? String(t) : undefined;
}

function withFcm(payload) {
    const fcm = optionalFcmToken();
    if (fcm) {
        return { ...payload, fcm_token: fcm };
    }
    return { ...payload };
}

export function useCustomerUtils() {
    const customerStore = useCustomerStore();
    function updateStore(data) {
        customerStore.customer.data = Customer.getInstance(data);
        customerStore.isLoaded = true;
    }

    /**
     * Step 1 signup: request OTP to mobile
     * @param {object} [options]
     * @param {boolean} [options.third_party_declaration_accepted]
     */
    async function requestSignupOtp(country, mobile_number, options = {}) {
        const payload = {
            country: String(country),
            mobile_number: String(mobile_number),
        };
        if (options.third_party_declaration_accepted !== undefined) {
            payload.third_party_declaration_accepted = options.third_party_declaration_accepted;
        }
        await axios.post(
            '/client/v1/signup',
            withFcm(payload),
            { headers: clientMobileAuthHeaders() },
        );
    }

    async function requestLoginOtp(country, mobile_number) {
        await axios.post(
            '/client/v1/get-login-otp',
            withFcm({
                country: String(country),
                mobile_number: String(mobile_number),
            }),
            { headers: clientMobileAuthHeaders() },
        );
    }

    async function loginWithMobileOtp(country, mobile_number, otp) {
        await axios.post(
            '/client/v1/login',
            withFcm({
                country: String(country),
                mobile_number: String(mobile_number),
                password: String(otp),
            }),
            { headers: clientMobileAuthHeaders() },
        ).then((response) => {
            updateStore(response.data);
        });
    }

    async function resendLoginOtp(country, mobile_number) {
        await axios.post(
            '/client/v1/get-login-otp',
            withFcm({
                country: String(country),
                mobile_number: String(mobile_number),
            }),
            { headers: clientMobileAuthHeaders() },
        );
    }

    async function resendMobileVerification(country, mobile_number) {
        await axios.post(
            '/client/v1/resend-mobile-verification',
            withFcm({
                country: String(country),
                mobile_number: String(mobile_number),
            }),
            { headers: clientMobileAuthHeaders() },
        );
    }

    async function mfa(otp) {
        await axios.post('/client/v1/mfa', {
            otp: otp,
        }).then((response) => {
            updateStore(response.data);
        })
    }

    async function resendMfaOtp () {
        await axios.post('/client/v1/resend-mfa-otp', {})
    }

    async function logout() {
        await axios.post('/client/v1/logout', {}).then(() => {
            customerStore.customer.data = null;
            customerStore.isLoaded = false;
        })
    }

    async function refresh() {
        if (refreshPromise) return refreshPromise;
        refreshPromise = axios.get('/client/v1/profile')
            .then((response) => {
                updateStore(response.data);
            })
            .finally(() => {
                refreshPromise = null;
            });

        return refreshPromise;
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

    async function getAccountVerificationToken(documentCategory, documentType, file = null, returnUrl = null) {
        let requestParams = {};
        requestParams = file ? {
            file_name: file.name,
            file_type: file.type,
        } : {};
        requestParams.return_url = returnUrl;
        return axios.get(`/client/v1/account-verification/token/${documentCategory.id}/${documentType.id}`, {
            params: requestParams
        });
    }

    async function getLivelinessToken(api) {
        return axios.get(`/client/v1/account-verification/liveliness-token`, {
            params: {
                api: api,
            },
        });
    }

    async function documentCategories() {
        return axios.get(`/client/v1/document-categories`);
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

    async function deleteDevice(deviceId) {
        return axios.delete(`/client/v1/device/${deviceId}`);
    }

    async function changePassword(currentPassword, newPassword, confirmNewPassword) {
        return axios.post(`/client/v1/change-password`, {
            current_password: currentPassword,
            password: newPassword,
            confirm_password: confirmNewPassword,
        });
    }

    async function forgotPassword(email) {
        return axios.post(`/client/v1/forgot-password`, {
            email: email
        });
    }

    async function resetPassword(token, newPassword, confirmNewPassword) {
        return axios.post(`/client/v1/reset-password`, {
            token: atob(token),
            password: newPassword,
            confirm_password: confirmNewPassword,
        });
    }
    async function applyInfoFromPoiDocument() {
        return axios.post(`/client/v1/apply-info-from-poi`);
    }

    return {
        updateStore,
        requestSignupOtp,
        requestLoginOtp,
        loginWithMobileOtp,
        resendLoginOtp,
        resendMobileVerification,
        mfa,
        resendMfaOtp,
        refresh,
        resendEmailVerification,
        verifyEmail,
        updateCountry,
        updateProfileAttribute,
        updateMobileNumber,
        logout,
        getAccountVerificationToken,
        getLivelinessToken,
        documentCategories,
        uploadDocument,
        tasks,
        devices,
        deleteDevice,
        changePassword,
        forgotPassword,
        resetPassword,
        applyInfoFromPoiDocument,
    }
}