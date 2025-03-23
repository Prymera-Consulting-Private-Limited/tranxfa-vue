import axios from "axios";
import { useCustomerUtils } from "@/composables/customer_utils.js";
export function useTransactionUtils() {

    const customerUtils = useCustomerUtils();

    const getTransaction = async (id) => {
        return axios.get(`/client/v1/transaction/${id}`, {
            headers: {
                'X-Customer-Token': customerUtils.getAuthToken(),
            }
        });
    }

    const get = async () => {
        return axios.get(`/client/v1/transactions`, {
            headers: {
                'X-Customer-Token': customerUtils.getAuthToken(),
            }
        });
    }

    return {
        get,
        getTransaction,
    }
}