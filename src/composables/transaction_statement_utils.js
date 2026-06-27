import axios from "axios";

export function useTransactionStatementUtils() {

    async function getPaymentCurrencies() {
        return axios.get('/client/v1/transaction/payment/currencies');
    }

    async function requestStatement(payload) {
        return axios.post('/client/v1/transaction/statement', payload);
    }

    return {
        getPaymentCurrencies,
        requestStatement,
    };
}
