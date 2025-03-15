<script setup>
import CustomerAttribute from "@/models/customer_attribute.js";
import {useCountryUtils} from "@/composables/country_utils.js";
import {computed, onMounted, ref} from "vue";
import CountryVSelectInput from "@/components/CustomerAttribute/CountryVSelectInput.vue";

const props = defineProps({
  attr: {
    type: CustomerAttribute,
    required: true
  },
})

const countryUtils = useCountryUtils();
const countries = ref([]);
const nationality = computed({
  get () {
    return countries.value.find((o) => o.id === props.attr.value)
  },
  set(nationality) {
    props.attr.value = nationality.id || null;
  }
})

onMounted(async () => {
  countries.value = await countryUtils.getCountries();
})

const emit = defineEmits(['customer:attribute:updated']);

const notifyNationalityUpdated = (value) => {
  emit('customer:attribute:updated', props.attr, value?.id);
}

</script>

<template>
  <CountryVSelectInput
      v-bind:itemLabelGenerator="'demonym'"
      v-bind:optionLabelGenerator="'demonym'"
      v-bind:countries="countries"
      v-bind:model="nationality"
      v-on:update:modelValue="notifyNationalityUpdated"
  />
</template>