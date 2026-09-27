import axios from "axios";
export function useTransactionUtils() {
    const getTransaction = async (id) => {
        return axios.get(`/client/v1/transaction/${id}`);
    }

    const retryPayment = async (id, paymentData = null) => {
        return axios.post(`/client/v1/transaction/payment/${id}`, paymentData);
    }

    /**
     * Withdraws the transfer's waiting payment (SD-1418). On bank transfer and
     * PayID that frees the customer's deposit account at once; until then every
     * other payment into it is refused. The transfer stays open and can be paid
     * again.
     *
     * 200 is the payment, CANCELLED. A 409 payment_not_open means it is too
     * late: paid, failed, already cancelled, or held at the provider. A 409
     * payment_not_cancellable (SD-1422) means this gateway cannot withdraw it.
     * Either way the transfer is re-read afterwards.
     *
     * @param {string} id the transfer's id
     */
    const cancelPayment = async (id) => {
        return axios.post(`/client/v1/transaction/payment/${id}/cancel`);
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
        cancelPayment,
        getTransaction,
        iHaveMadePayment,
    }
}