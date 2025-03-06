<script setup>
import CustomerAttribute from "@/models/customer_attribute.js";
import {useCountryUtils} from "@/composables/country_utils.js";
import {computed, onMounted, ref} from "vue";
import CountryVSelectInput from "@/components/CustomerAttribute/CountryVSelectInput.vue";

const props = defineProps({
  attr: CustomerAttribute,
})

const countryUtils = useCountryUtils();
const countries = ref([]);
const nationality = computed({
  get () {
    return countries.value.find((o) => o.id === props.attr.value)
  },
  set(nationality) {
    if (nationality) {
      props.attr.value = nationality.id;
    } else {
      props.attr.value = null;
    }
  }
})

onMounted(async () => {
  countries.value = await countryUtils.getCountries();
})

function updateNationality(updated) {
  nationality.value = updated;
}
</script>

<template>
  <CountryVSelectInput v-bind:countries="countries" v-bind:model="nationality" v-bind:labelGenerator="`demonym`" v-on:update:modelValue="updateNationality" :attr="attr">

  </CountryVSelectInput>
</template>