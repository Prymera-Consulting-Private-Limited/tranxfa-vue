import {inject, ref} from "vue";
import {useCountriesStore} from "@/stores/countries.js";
import Country from "@/models/country.js";

export function useCountryUtils() {
    const $axios = inject('axios')
    const countriesStore = useCountriesStore();
    const sources = ref([]);

    async function getCountries() {
        if (! countriesStore.isLoaded) {
            $axios.get('/client/v1/countries').then((response) => {
                for (const data of response.data.data) {
                    countriesStore.add(Country.getInstance(data));
                }
                countriesStore.isLoaded = true;
            })
        }

        return countriesStore.countries.data;
    }

    async function getSources() {
        $axios.get('/client/v1/countries/source').then((response) => {
            for (const data of response.data.data) {
                sources.value.push(Country.getInstance(data));
            }
        })
    }

    return {
        getCountries,
        getSources,
        sources,
    }
}