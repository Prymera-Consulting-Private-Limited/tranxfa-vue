import axios from "axios";
export function usePaymentMethodUtils() {
    const getPaymentMethodLinkAccountToken = async (provider) => {
        return axios.get(`/client/v1/payment-methods/link-account-token/${provider}`);
    }

    const linkPaymentAccount = async (currency, paymentMethod, provider, data) => {
        return axios.post(`/client/v1/payment-methods/link-account/${currency}/${paymentMethod}/${provider}`, data);
    }

    return {
        getPaymentMethodLinkAccountToken,
        linkPaymentAccount,
    }
}