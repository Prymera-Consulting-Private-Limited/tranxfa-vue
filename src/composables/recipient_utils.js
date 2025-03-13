import {inject} from "vue";
import {useCustomerStore} from "@/stores/customer.js";

export function useRecipientUtils() {

    const $axios = inject('axios')
    const customerStore = useCustomerStore();

    const whisper = async (query = null) => {
        return $axios.get('/client/v1/recipients/whisper', {
            params: query,
            headers: {
                'X-Customer-Token': customerStore.customer?.session?.sessionToken || localStorage.getItem('customerSessionToken'),
            }
        });
    }

    const add = async (payoutChannel, data) => {
        return $axios.post('/client/v1/recipients/add', data, {
            params: {
                payout_channel_id: payoutChannel.id,
            },
            headers: {
                'X-Customer-Token': customerStore.customer?.session?.sessionToken || localStorage.getItem('customerSessionToken'),
            }
        });
    }

    const get = async (query = null) => {
        return $axios.get('/client/v1/recipients', {
            params: query,
            headers: {
                'X-Customer-Token': customerStore.customer?.session?.sessionToken || localStorage.getItem('customerSessionToken'),
            }
        });
    }

    return {
        whisper,
        add,
        get,
    };
}