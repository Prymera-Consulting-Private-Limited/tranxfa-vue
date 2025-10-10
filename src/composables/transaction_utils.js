import axios from "axios";
export function useTransactionUtils() {
    const getTransaction = async (id) => {
        return axios.get(`/client/v1/transaction/${id}`);
    }

    const retryPayment = async (id) => {
        return axios.post(`/client/v1/transaction/payment/${id}`);
    }

    const get = async (page = null) => {
        return axios.get(`/client/v1/transactions`, {
            params: {
                page: page,
            },
        });
    }

    const iHaveMadePayment = async (id) => {
        return axios.post(`/client/v1/transaction/payment-sent/${id}`);
    }

    return {
        get,
        retryPayment,
        getTransaction,
        iHaveMadePayment,
    }
}