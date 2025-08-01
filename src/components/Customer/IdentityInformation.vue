<script setup>
import {useCustomerStore} from "@/stores/customer.js";
import {computed, onMounted, ref, watch} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCountriesStore} from "@/stores/countries.js";
import CustomerAttributeForm from "@/components/Customer/CustomerAttributeForm.vue";
import CustomerAttributeCategory from "@/enums/customer_attribute_category.js";
import FlagIcon from "vue3-flag-icons";
import {useCountryUtils} from "@/composables/country_utils.js";

const isLoading = ref(false)
const customerStore = useCustomerStore()
const countriesStore = useCountriesStore();
const customerUtils = useCustomerUtils()
const countryUtils = useCountryUtils();

const customer = customerStore.customer;

onMounted( async () => {
  if (! customerStore.isLoaded) {
    await customerUtils.refresh();
  }
  if (! countriesStore.isLoaded) {
    await countryUtils.getCountries();
  }
});

const showLoading = computed(() => {
  return isLoading.value || customerStore.isLoaded === false || countriesStore.isLoaded === false;
})

const emit = defineEmits(['changeCountry', 'identityUpdated'])

const changeCountry = () => {
  emit('changeCountry')
}

const identityUpdated = () => {
  emit('identityUpdated')
}
</script>
<template>
  <div class="relative flex-1 flex items-center justify-center p-4 md:p-8">
    <div v-if="showLoading" class="absolute inset-0 flex items-center justify-center bg-white/75 z-10">
      <i class="pi pi-spin pi-spinner text-5xl text-brand-700"></i>
    </div>
    <div v-show="! showLoading" class="w-full max-w-xl">
      <!-- Logo at Top Left (Desktop)  -->
      <div class="hidden md:block flex items-center justify-center w-full">
        <a href="javascript:"><img src="/images/logo.png" alt="VeloxPays Logo" class="max-w-64 max-h-10 mb-5"></a>
      </div>
      <!-- Form Header -->
      <h2 class="text-2xl font-semibold text-black mb-4 mt-14 sm:mt-8">Personal Details</h2>
      <div class="text-sm text-gray-900 mb-8 flex items-center justify-start gap-x-1">
        You've signed up from <FlagIcon v-if="customer?.data?.country" :class="['text-xl border border-gray-100']" :code="customer?.data?.country?.iso2Alpha.toLowerCase()" circle  /> <span class="font-semibold">{{ customer?.data?.country?.commonName }}</span>
        <a class="text-brand-700 hover:underline" @click="changeCountry" href="javascript:">Change</a></div>
      <!-- Form -->
      <CustomerAttributeForm
          v-bind:categories="`${CustomerAttributeCategory.IDENTITY}`"
          v-bind:showLoading="showLoading"
          v-on:customer:attribute_category:updated="identityUpdated"
      />
    </div>
  </div>
</template>
