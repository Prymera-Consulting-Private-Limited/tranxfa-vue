import { defineStore } from 'pinia';
import {reactive, ref} from "vue";

export const useCustomerStore = defineStore('customer', () => {
    const isLoaded = ref(false);
    const customer = reactive({
        data: null,
    });

    const reset = () => {
        isLoaded.value = false;
        customer.data = null;
    }

    return {
        isLoaded,
        customer,
        reset,
    }
});