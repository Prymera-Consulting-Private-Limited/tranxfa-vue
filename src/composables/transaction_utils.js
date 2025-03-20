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

    return {
        getTransaction,
    }
}