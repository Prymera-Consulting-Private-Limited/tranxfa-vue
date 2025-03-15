import Customer from "@/models/customer.js";
import {inject} from "vue";
import {useCustomerStore} from "@/stores/customer.js";

export function useCustomerUtils() {
    const $axios = inject('axios')
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
        await $axios.post('/client/v1/signup', {
            email: email,
            password: password,
            confirm_password: confirmPassword,
        }).then((response) => {
            updateStore(response.data, true);
        });
    }

    async function login(email, password) {
        await $axios.post('/client/v1/login', {
            email: email,
            password: password,
        }).then((response) => {
            updateStore(response.data, true);
        })
    }

    async function logout() {
        await $axios.post('/client/v1/logout', {}, {
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
        return $axios.get('/client/v1/profile', {
            headers: {
                'X-Customer-Token': getAuthToken(),
            }
        }).then((response) => {
            updateStore(response.data);
        })
    }

    async function resendEmailVerification() {
        await $axios.post('/client/v1/resend-email-verification', {}, {
            headers: {
                'X-Customer-Token': getAuthToken(),
            }
        })
    }

    async function verifyEmail(otp) {
        await $axios.post('/client/v1/verify-email-address', {
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
        await $axios.post('/client/v1/update-country', {
            country_id: country.id,
        }, {
            headers: {
                'X-Customer-Token': getAuthToken(),
            }
        }).then((response) => {
            updateStore(response.data);
        })
    }

    async function updateProfileIdentity(data) {
        const requestData = {};
        for (const attr of Object.keys(data)) {
            const unzipped = attr.split('.');
            if (unzipped.length === 1) {
                requestData[attr] = data[attr];
            } else {
                requestData[unzipped[0]] = {};
                requestData[unzipped[0]][unzipped[1]] = data[attr];
            }
        }

        await $axios.post('/client/v1/update?category=identity', requestData, {
            headers: {
                'X-Customer-Token': getAuthToken(),
            }
        }).then((response) => {
            updateStore(response.data);
        })
    }

    async function updateMobileNumber(country, number) {
        await $axios.post('/client/v1/update-mobile-number', {
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

    async function getIdentityVerificationToken(documentType) {
        return $axios.get('/client/v1/customer/identity-verification-token', {
            params: {
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
        updateProfileIdentity,
        updateMobileNumber,
        logout,
        getIdentityVerificationToken,
    }
}