import { defineStore } from 'pinia';
import {reactive, ref} from "vue";
import Customer from "@/models/customer.js";

export const useCustomerStore = defineStore('customer', () => {
    const isLoaded = ref(false);
    const customer = reactive(new Customer());

    return {
        isLoaded,
        customer,
    }
});