<script setup>
import BrandLogo from "@/components/BrandLogo.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {computed, onMounted, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCountriesStore} from "@/stores/countries.js";
import CustomerAttributeForm from "@/components/Customer/CustomerAttributeForm.vue";
import CustomerAttributeCategory from "@/enums/customer_attribute_category.js";
import {useCountryUtils} from "@/composables/country_utils.js";
import {addressIsSkippable} from "@/onboarding_config.js";

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

const emit = defineEmits(['addressUpdated', 'editPersonalInformationRequested', 'addressSkipped'])

const addressUpdated = () => {
  emit('addressUpdated')
}

// Only offered where the deployment marks the address optional. The workflow
// treats it as an ordinary PROCEED - nothing is saved, and the transfer wizard
// asks for the address later when the backend answers 412
// incomplete_customer_address.
const skip = () => {
  emit('addressSkipped');
}

const editPersonalInformation = () => {
  emit('editPersonalInformationRequested');
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
        <a href="javascript:"><BrandLogo class="mb-5" /></a>
      </div>
      <!-- Form Header -->
      <h2 class="text-2xl font-semibold text-black mb-4 mt-14 sm:mt-8">{{ $t('onboarding.addressDetails') }}</h2>
      <p class="text-md text-[#B7A3C1] mb-8 text-left"><i18n-t keypath="onboarding.addressIntro" scope="global"><template #country><span class="font-semibold text-brand-700">{{ customer?.data?.country?.commonName }}</span></template></i18n-t></p>
      <!-- Form -->
      <CustomerAttributeForm
          v-bind:categories="`${CustomerAttributeCategory.ADDRESS}`"
          v-bind:showLoading="showLoading"
          v-on:customer:attribute_category:updated="addressUpdated"
      />
      <!-- Only where the deployment marks the address optional. The hint says
           where it will be asked for instead, so skipping does not read as
           dodging something that never comes back. -->
      <div v-if="addressIsSkippable()" class="mt-6">
        <p class="text-center text-sm/6 text-gray-500">{{ $t('onboarding.addressSkipHint') }}</p>
        <button
            @click="skip"
            :disabled="showLoading"
            :class="{'opacity-70': showLoading}"
            type="button"
            class="mt-3 block min-h-11 w-full cursor-pointer rounded-xl bg-gray-100 px-6 py-3 text-sm/6 font-semibold text-gray-700 transition hover:bg-gray-200">
          {{ $t('onboarding.skipForNow') }}
        </button>
      </div>

      <div class="text-center mt-12">
        <a @click="editPersonalInformation" class="inline-flex items-center rounded-full px-3 py-1.5 text-sm/6 font-medium text-brand-700 transition-colors hover:bg-brand-50 hover:underline" href="javascript:">{{ $t('onboarding.editPersonalInformation') }}</a>
      </div>
    </div>
  </div>
</template>
