import axios from "axios";
export function useTransactionUtils() {
    const getTransaction = async (id) => {
        return axios.get(`/client/v1/transaction/${id}`);
    }

    const retryPayment = async (id, paymentData = null) => {
        return axios.post(`/client/v1/transaction/payment/${id}`, paymentData);
    }

    /**
     * @param {number|null} page
     * @param {object} filters the documented List Transactions filters
     *   (q, state_id, payout_method_id, payout_country_id, recipient_id,
     *   start_date, end_date, limit); undefined values are not sent
     */
    const get = async (page = null, filters = {}) => {
        return axios.get(`/client/v1/transactions`, {
            params: {
                page: page,
                ...filters,
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