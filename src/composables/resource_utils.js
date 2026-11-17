import axios from "axios";

export function useResourceUtils () {
    /**
     * The full list the tenant offers.
     *
     * This deliberately sends no `country_id`. The endpoint does accept one and
     * narrows on it, but the narrowing is a plain join: a country with no
     * mapping rows comes back empty rather than unrestricted, and no country on
     * any tenant has rows. We started sending it on 12 Sep because the reference
     * documented it, and that emptied a required field - see SD-1182. The
     * parameter comes back once SD-1181 makes the back end fall back to the full
     * list on an empty mapping.
     */
    const relationships =  async () => {
        return axios.get('/client/v1/resources/relationships');
    }

    const occupations =  async () => {
        return axios.get('/client/v1/resources/occupations');
    }

    const currencySalaryRanges =  async () => {
        return axios.get('/client/v1/resources/currency-salary-ranges');
    }

    /**
     * @param option
     * @returns {Promise<axios.AxiosResponse<any>>}
     */
    const subDeliveryOptions =  async (option) => {
        return axios.get('/client/v1/resources/sub-delivery-options/' + option);
    }

    return {
        relationships,
        occupations,
        currencySalaryRanges,
        subDeliveryOptions,
    }
}