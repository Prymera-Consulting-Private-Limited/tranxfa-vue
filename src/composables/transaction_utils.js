import axios from "axios";
export function useTransactionUtils() {
    const getTransaction = async (id) => {
        return axios.get(`/client/v1/transaction/${id}`);
    }

    const get = async () => {
        return axios.get(`/client/v1/transactions`);
    }

    return {
        get,
        getTransaction,
    }
}