import axios from "axios";

export function useRecipientUtils() {
    const whisper = async (query = null) => {
        return axios.get('/client/v1/recipients/whisper', {
            params: query,
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
        });
    }

    const get = async (query = null) => {
        return axios.get('/client/v1/recipients', {
            params: query,
        });
    }

    const getRecipient = async (id) => {
        return axios.get(`/client/v1/recipient/${id}`);
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
        return axios.post(`/client/v1/recipient/send-money/${recipient.id}`, data);
    }

    const lookup = async (payoutChannel, query = []) => {
        return axios.get(`/client/v1/recipient/name-lookup/${payoutChannel.id}`, {
            params: query,
        });
    }

    return {
        whisper,
        add,
        get,
        getRecipient,
        getQuote,
        lookup,
    };
}