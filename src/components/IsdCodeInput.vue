<script setup>
import {useCountryUtils} from "@/composables/country_utils.js";
import {computed, onMounted, ref} from "vue";
import CountryVSelectInput from "@/components/CustomerAttribute/CountryVSelectInput.vue";
const countryUtils = useCountryUtils();
const countries = ref([]);
const props = defineProps({
  modelValue: String,
  optionLabelGenerator: {
    type: Function,
    default: null,
  },
  itemLabelGenerator: {
    type: Function,
    default: null,
  },
});
const emit = defineEmits(['update:modelValue']);
const selectedIsdCode = ref(props.modelValue);
const isdCode = computed({
  get () {
    return countries.value.find((o) => o.id === props.modelValue)
  },
  set(isdCode) {
    selectedIsdCode.value = isdCode?.id || null;
  }
})

onMounted(async () => {
  countries.value = await countryUtils.getCountries();
})

function updateIsdCode(updated) {
  isdCode.value = updated;
  emit('update:modelValue', updated);
}

function defaultOptionLabelGenerator(country) {
  return country.commonName + ' (+' + country.callingCode + ')';
}

function defaultItemLabelGenerator(country) {
  return defaultOptionLabelGenerator(country);
}
</script>

<template>
  <CountryVSelectInput
      v-bind:itemLabelGenerator="itemLabelGenerator || defaultItemLabelGenerator"
      v-bind:optionLabelGenerator="optionLabelGenerator || defaultOptionLabelGenerator"
      v-bind:countries="countries"
      v-bind:model="isdCode"
      v-on:update:modelValue="updateIsdCode" />
</template>