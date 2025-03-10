import {inject} from "vue";
import PayoutChannel from "@/models/payout_channel.js";

export function usePayoutChannelUtils() {
    const $axios = inject('axios')

    const getChannel = async (query = null) => {
        const params = {
            country_id: query?.country?.id,
            currency_id: query?.currency?.id,
            payout_method_id: query?.payoutMethod?.id,
        };
        return await $axios.get('/client/v1/payout/channel', {
            params: params,
        }).then((response) => {
            return PayoutChannel.getInstance(response.data);
        });
    }

    return {
        getChannel
    }
}