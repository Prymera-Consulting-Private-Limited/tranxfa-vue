import {useCustomerUtils} from "@/composables/customer_utils.js";
import axios from "axios";

export function useRecipientUtils() {

    const customerUtils = useCustomerUtils();

    const whisper = async (query = null) => {
        return axios.get('/client/v1/recipients/whisper', {
            params: query,
            headers: {
                'X-Customer-Token': customerUtils.getAuthToken(),
            }
        });
    }

    const add = async (payoutChannel, data, quote = null) => {
        const params = {
            payout_channel_id: payoutChannel.id,
        };
        if (quote) {
            params.quote_id = quote.id;
        }
        return axios.post('/client/v1/recipients/add', data, {
            params: params,
            headers: {
                'X-Customer-Token': customerUtils.getAuthToken(),
            }
        });
    }

    const get = async (query = null) => {
        return axios.get('/client/v1/recipients', {
            params: query,
            headers: {
                'X-Customer-Token': customerUtils.getAuthToken(),
            }
        });
    }

    const getRecipient = async (id) => {
        return axios.get(`/client/v1/recipient/${id}`, {
            headers: {
                'X-Customer-Token': customerUtils.getAuthToken(),
            }
        });
    }

    const getQuote = async (recipient, quote) => {
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
        return axios.post(`/client/v1/recipient/send-money/${recipient.id}`, data, {
            headers: {
                'X-Customer-Token': customerUtils.getAuthToken(),
            }
        });
    }

    return {
        whisper,
        add,
        get,
        getRecipient,
        getQuote,
    };
}