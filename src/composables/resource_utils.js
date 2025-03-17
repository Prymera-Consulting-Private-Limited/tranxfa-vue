import axios from "axios";

export function useResourceUtils () {
    const relationships =  async () => {
        return axios.get('/client/v1/resources/relationships');
    }

    return {
        relationships,
    }
}