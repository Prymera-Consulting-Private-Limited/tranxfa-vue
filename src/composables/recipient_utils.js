import {inject} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";

const customerUtils = useCustomerUtils();

export function useRecipientUtils() {

    const $axios = inject('axios')
    const customerUtils = useCustomerUtils();

    const whisper = async (query = null) => {
        return $axios.get('/client/v1/recipients/whisper', {
            params: query,
            headers: {
                'X-Customer-Token': customerUtils.getAuthToken(),
            }
        });
    }

    const add = async (payoutChannel, data) => {
        return $axios.post('/client/v1/recipients/add', data, {
            params: {
                payout_channel_id: payoutChannel.id,
            },
            headers: {
                'X-Customer-Token': customerUtils.getAuthToken(),
            }
        });
    }

    const get = async (query = null) => {
        return $axios.get('/client/v1/recipients', {
            params: query,
            headers: {
                'X-Customer-Token': customerUtils.getAuthToken(),
            }
        });
    }

    const getRecipient = async (id) => {
        return $axios.get(`/client/v1/recipient/${id}`, {
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
    };
}