<script setup>
import {useCustomerStore} from "@/stores/customer.js";
import {computed, onMounted, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCountriesStore} from "@/stores/countries.js";
import CustomerAttributeForm from "@/components/Customer/CustomerAttributeForm.vue";
import CustomerAttributeCategory from "@/enums/customer_attribute_category.js";
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

const emit = defineEmits(['addressUpdated', 'editPersonalInformationRequested', 'skipAddressInformation'])

const addressUpdated = () => {
  emit('addressUpdated')
}

const editPersonalInformation = () => {
  emit('editPersonalInformationRequested');
}

const skip = () => {
  emit('skipAddressInformation');
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
        <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-w-64 max-h-10 mb-5"></a>
      </div>
      <!-- Form Header -->
      <h2 class="text-2xl font-semibold text-black mb-4 mt-14 sm:mt-8">Address Details</h2>
      <p class="text-md text-[#B7A3C1] mb-8 text-left">
        Please provide your full residential address in
        <span class="font-semibold text-brand-700">{{ customer?.data?.country?.commonName }}</span>.
        Accurate address information is required to comply with financial regulations.
        You can skip for now and provide it when you send money.
      </p>
      <!-- Form -->
      <CustomerAttributeForm
          v-bind:categories="`${CustomerAttributeCategory.ADDRESS}`"
          v-bind:showLoading="showLoading"
          v-on:customer:attribute_category:updated="addressUpdated"
      />
      <button
          @click="skip"
          :disabled="showLoading"
          :class="[{'opacity-70': showLoading}]"
          type="button"
          class="block mt-3 w-full bg-gray-200 hover:text-gray-500 text-gray-600 text-center py-3 rounded-[10px] font-medium hover:bg-gray-300 transition cursor-pointer">
        Skip for now
      </button>
      <div class="text-center mt-12">
        <a @click="editPersonalInformation" class="text-brand-700 text-sm hover:underline" href="javascript:">Edit Personal Information</a>
      </div>
    </div>
  </div>
</template>
