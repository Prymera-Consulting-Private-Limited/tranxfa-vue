import Customer from "@/models/customer.js";
import {inject} from "vue";
import {useCustomerStore} from "@/stores/customer.js";

export function useCustomerUtils() {
    const $axios = inject('axios')
    const customerStore = useCustomerStore();

    async function register(email, password, confirmPassword) {
        await $axios.post('/client/v1/signup', {
            email: email,
            password: password,
            confirm_password: confirmPassword,
        }).then((response) => {
            customerStore.customer = Customer.getInstance(response.data);
            customerStore.isLoaded = true;
            localStorage.setItem('customerSessionToken', customerStore.customer?.session?.sessionToken);
        });
    }

    async function login(email, password) {
        await $axios.post('/client/v1/login', {
            email: email,
            password: password,
        }).then((response) => {
            customerStore.customer = Customer.getInstance(response.data);
            customerStore.isLoaded = true;
            localStorage.setItem('customerSessionToken', customerStore.customer?.session?.sessionToken);
        })
    }

    async function logout() {
        await $axios.post('/client/v1/logout', {}, {
            headers: {
                'X-Customer-Token': customerStore.customer?.session?.sessionToken || localStorage.getItem('customerSessionToken'),
            }
        }).then(() => {
            customerStore.customer = null;
            customerStore.isLoaded = false;
            localStorage.removeItem('customerSessionToken');
        })
    }

    async function refresh() {
        return $axios.get('/client/v1/profile', {
            headers: {
                'X-Customer-Token': localStorage.getItem('customerSessionToken'),
            }
        }).then((response) => {
            customerStore.customer = Customer.getInstance(response.data);
            customerStore.isLoaded = true;
        })
    }

    async function resendEmailVerification() {
        await $axios.post('/client/v1/resend-email-verification', {}, {
            headers: {
                'X-Customer-Token': customerStore.customer?.session?.sessionToken || localStorage.getItem('customerSessionToken'),
            }
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
            customerStore.customer = Customer.getInstance(response.data);
            customerStore.isLoaded = true;
        })
    }

    async function updateCountry(country) {
        await $axios.post('/client/v1/update-country', {
            country_id: country.id,
        }, {
            headers: {
                'X-Customer-Token': customerStore.customer?.session?.sessionToken || localStorage.getItem('customerSessionToken'),
            }
        }).then((response) => {
            customerStore.customer = Customer.getInstance(response.data);
            customerStore.isLoaded = true;
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
            customerStore.customer = Customer.getInstance(response.data);
            customerStore.isLoaded = true;
        })
    }

    async function updateMobileNumber(country, number) {
        await $axios.post('/client/v1/update-mobile-number', {
            mobile_number_country_id: country,
            mobile_number: number,
        }, {
            headers: {
                'X-Customer-Token': customerStore.customer?.session?.sessionToken || localStorage.getItem('customerSessionToken'),
            }
        }).then((response) => {
            customerStore.customer = Customer.getInstance(response.data);
            customerStore.isLoaded = true;
        })
    }

    async function getIdentityVerificationToken() {
        return $axios.get('/client/v1/customer/identity-verification-token', {
            headers: {
                'X-Customer-Token': customerStore.customer?.session?.sessionToken || localStorage.getItem('customerSessionToken'),
            }
        });
    }

    return {
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