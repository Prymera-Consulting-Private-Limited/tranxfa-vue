import {inject, reactive} from "vue";
import Quote from "@/models/quote.js";
import {useCustomerStore} from "@/stores/customer.js";

export function useQuoteUtils() {
    const $axios = inject('axios')
    const quote = reactive({
        data: new Quote(),
    });
    const customerStore = useCustomerStore();

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
        await $axios.get('/client/v1/quote', {
            params: params,
            headers: {
                'X-Customer-Token': customerStore.customer?.session?.sessionToken || localStorage.getItem('customerSessionToken'),
            }
        }).then((response) => {
            quote.data = Quote.getInstance(response.data);
        });
    }

    return {
        quote,
        getQuote
    }
}