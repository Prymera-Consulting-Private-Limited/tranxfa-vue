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

    return {
        isLoaded,
        countries,
        add,
    }
});