import {ref} from "vue";
import {useCountriesStore} from "@/stores/countries.js";
import Country from "@/models/country.js";
import axios from "axios";

export function useCountryUtils() {
    const countriesStore = useCountriesStore();
    const sources = ref([]);

    async function getCountries() {
        if (! countriesStore.isLoaded) {
            axios.get('/client/v1/countries').then((response) => {
                for (const data of response.data.data) {
                    countriesStore.add(Country.getInstance(data));
                }
                countriesStore.isLoaded = true;
            })
        }

        return countriesStore.countries.data;
    }

    // Replaces the list rather than appending, and returns the request: it
    // used to push into the shared ref (a second call doubled every country)
    // and resolve before the countries had arrived.
    async function getSources() {
        return axios.get('/client/v1/countries/source').then((response) => {
            sources.value = response.data.data.map((data) => Country.getInstance(data));

            return response;
        })
    }

    return {
        getCountries,
        getSources,
        sources,
    }
}