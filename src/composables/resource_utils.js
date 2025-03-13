import {inject} from "vue";

export function useResourceUtils () {
    const $axios = inject('axios');

    const relationships =  async () => {
        return $axios.get('/client/v1/resources/relationships');
    }

    return {
        relationships,
    }
}