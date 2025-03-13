import {inject} from "vue";

export function useRecipientUtils() {

    const $axios = inject('axios')

    const whisper = async (query = null) => {
        return $axios.get('/client/v1/recipients/whisper', query, {
            headers: {
                'X-Customer-Token': customerStore.customer?.session?.sessionToken || localStorage.getItem('customerSessionToken'),
            }
        });
    }

    return {
        whisper
    };
}