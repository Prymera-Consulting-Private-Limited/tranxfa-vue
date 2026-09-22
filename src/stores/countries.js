import { defineStore } from 'pinia';
import {reactive, ref} from "vue";

export const useCountriesStore = defineStore('countries', () => {
    const isLoaded = ref(false);
    const countries = reactive({
        data: []
    });

    const add = (country) => {
        countries.data.push(country);
    }

    const reset = () => {
        isLoaded.value = false;
        countries.data = [];
    }

    return {
        isLoaded,
        countries,
        add,
        reset,
    }
});