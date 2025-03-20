import {reactive} from "vue";
import Quote from "@/models/quote.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import axios from "axios";

export function useQuoteUtils() {
    const quote = reactive({
        data: new Quote(),
    });
    const customerUtils = useCustomerUtils();

    const getQuote = async (query = null) => {
        const params = {
            amount_type: query?.amountType,
            amount: query?.amount,
            payment_country_id: query?.paymentCountry?.id,
            payment_currency_id: query?.paymentCurrency?.id,
            payout_country_id: query?.payoutCountry?.id,
            payout_currency_id: query?.payoutCurrency?.id,
            payout_method_id: query?.payoutMethod?.id,
            payout_company_id: query?.payoutCompany?.id,
        };

        await axios.get('/client/v1/quote', {
            params: params,
            headers: {
                'X-Customer-Token': customerUtils.getAuthToken(),
            }
        }).then((response) => {
            quote.data = Quote.getInstance(response.data);
        });
    }

    const saveQuote = async (quote) => {
        const data = {
            amount_type: quote?.amountType,
            amount: quote?.amount,
            payment_country_id: quote?.paymentCountry?.id,
            payment_currency_id: quote?.paymentCurrency?.id,
            payout_country_id: quote?.payoutCountry?.id,
            payout_currency_id: quote?.payoutCurrency?.id,
            payout_method_id: quote?.payoutMethod?.id,
            payout_company_id: quote?.payoutCompany?.id,
        };
        return axios.post('/client/v1/quote', data, {
            headers: {
                'X-Customer-Token': customerUtils.getAuthToken(),
            }
        });
    }

    const getTransferQuote = async (id) => {
        return axios.get(`/client/v1/quote/${id}`, {
            headers: {
                'X-Customer-Token': customerUtils.getAuthToken(),
            }
        });
    }

    const setRecipient = async (quoteId, recipient) => {
        return axios.post(`/client/v1/quote/recipient/${quoteId}`, {
            recipient_id: recipient.id,
        }, {
            headers: {
                'X-Customer-Token': customerUtils.getAuthToken(),
            }
        });
    }

    const confirmQuote = async (quote, purpose) => {
        return axios.post(`/client/v1/quote/confirm/${quote.id}`, {
            purpose_id: purpose.id,
        }, {
            headers: {
                'X-Customer-Token': customerUtils.getAuthToken(),
            }
        });
    }

    return {
        quote,
        getQuote,
        saveQuote,
        getTransferQuote,
        setRecipient,
        confirmQuote,
    }
}