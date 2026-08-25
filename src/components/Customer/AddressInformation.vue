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
  <div class="relative flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-4 md:items-center md:p-8">
    <div
      v-if="showLoading"
      class="absolute inset-0 z-10 flex items-center justify-center bg-white/75"
    >
      <i class="pi pi-spin pi-spinner text-5xl text-brand-700"></i>
    </div>

    <div v-show="!showLoading" class="w-full max-w-xl">
      <div class="hidden md:block">
        <a href="javascript:">
          <img
            src="/images/logo.png"
            alt="RemitSo Logo"
            class="mb-5 max-h-16 -ml-2"
          />
        </a>
      </div>

      <!-- Form Header -->
      <div class="mb-6">
        <h2 class="mb-3 text-2xl font-semibold leading-tight text-black">
          Address Details
        </h2>

        <p class="text-left text-sm leading-6 text-[#B7A3C1] sm:text-base">
          Please provide your full residential address in
          <span class="font-semibold text-brand-700">
            {{ customer?.data?.country?.commonName }}
          </span>.
        </p>
      </div>

      <!-- Form -->
      <CustomerAttributeForm
        :categories="`${CustomerAttributeCategory.ADDRESS}`"
        :showLoading="showLoading"
        @customer:attribute_category:updated="addressUpdated"
      />

      <!-- Skip Button -->
      <button
        @click="skip"
        :disabled="showLoading"
        type="button"
        class="mt-3 block w-full cursor-pointer rounded-full bg-gray-100 py-3.5 text-center text-base font-medium text-gray-600 transition-all duration-200 hover:bg-gray-200 hover:text-gray-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        Skip for now
      </button>

      <!-- Edit Personal Information -->
      <div class="mt-8 text-center sm:mt-10">
        <a
          @click="editPersonalInformation"
          class="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 hover:underline"
          href="javascript:"
        >
          Edit Personal Information
        </a>
      </div>
    </div>
  </div>
</template>
