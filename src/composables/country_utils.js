import {inject} from "vue";
import {useCountriesStore} from "@/stores/countries.js";
import Country from "@/models/country.js";

export function useCountryUtils() {
    const $axios = inject('axios')
    const countriesStore = useCountriesStore();

    function getObject(data) {
        const country = new Country();
        country.id = data.id;
        country.iso2Alpha = data.iso2_alpha;
        country.iso3Alpha = data.iso3_alpha;
        country.isoNumeric = data.iso_numeric;
        country.fipsCode = data.fips_code;
        country.slug = data.slug;
        country.callingCode = data.calling_code;
        country.commonName = data.common_name;
        country.officialName = data.official_name;
        country.endonym = data.endonym;
        country.demonym = data.demonym;

        return country;
    }

    async function getCountries() {
        if (! countriesStore.isLoaded) {
            $axios.get('/client/v1/countries').then((response) => {
                for (const data of response.data.data) {
                    countriesStore.add(getObject(data));
                }
                countriesStore.isLoaded = true;
            }).catch(() => {

            })
        }

        return countriesStore.countries.data;
    }

    return {
        getObject,
        getCountries,
    }
}