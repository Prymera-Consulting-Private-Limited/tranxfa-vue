import {inject, reactive} from "vue";
import Quote from "@/models/quote.js";
import {useCustomerStore} from "@/stores/customer.js";

export function useQuoteUtils() {
    const $axios = inject('axios')
    const quote = reactive({
        data: new Quote(),
    });
    const customerStore = useCustomerStore();

    const getQuote = async () => {
        $axios.get('/client/v1/quote', {
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