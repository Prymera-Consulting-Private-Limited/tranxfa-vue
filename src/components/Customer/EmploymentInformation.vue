<script setup>
import {useI18n} from "vue-i18n";

const {t} = useI18n();

import {failureMessage, logRequestFailure} from "@/composables/api_utils.js";
import LoadFailurePanel from "@/components/LoadFailurePanel.vue";
import BrandLogo from "@/components/BrandLogo.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {computed, onMounted, reactive, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCountriesStore} from "@/stores/countries.js";
import CustomerAttributeForm from "@/components/Customer/CustomerAttributeForm.vue";
import CustomerAttributeCategory from "@/enums/customer_attribute_category.js";
import {useCountryUtils} from "@/composables/country_utils.js";
import {useResourceUtils} from "@/composables/resource_utils.js";
import Occupation from "@/models/occupation.js";
import Currency from "@/models/currency.js";
import SalaryRange from "@/models/salary_range.js";

const isOccupationsLoading = ref(false)
const isSalaryRangesLoading = ref(false)
const customerStore = useCustomerStore()
const countriesStore = useCountriesStore();
const customerUtils = useCustomerUtils()
const countryUtils = useCountryUtils();
const resourceUtils = useResourceUtils();

const customer = customerStore.customer;

const occupations = ref([]);

const currencySalaryRange = reactive({
  currency: null,
  ranges: [],
});

// The form cannot be completed without occupations and salary ranges, so a
// failed load is shown instead of two empty dropdowns.
const loadFailure = ref(null);

function loadOptions() {
  loadFailure.value = null;

  if (! customerStore.isLoaded) {
    customerUtils.refresh().catch((e) => logRequestFailure(e, 'employment-customer'));
  }

  if (! countriesStore.isLoaded) {
    countryUtils.getCountries().catch((e) => logRequestFailure(e, 'employment-countries'));
  }

  isOccupationsLoading.value = true;
  resourceUtils.occupations().then((response) => {
    occupations.value = response.data.map((o) => Occupation.getInstance(o));
  }).catch((e) => {
    logRequestFailure(e, 'occupations');
    loadFailure.value = failureMessage(e, t('onboarding.weCouldntLoadThe'));
  }).finally(() => {
    isOccupationsLoading.value = false;
  });

  isSalaryRangesLoading.value = true;
  resourceUtils.currencySalaryRanges().then((response) => {
    if (response?.data?.currency) {
      currencySalaryRange.currency = Currency.getInstance(response.data.currency);
    }
    if (response?.data?.salary_ranges) {
      currencySalaryRange.ranges = response.data.salary_ranges.map((o) => SalaryRange.getInstance(o));
    }
  }).catch((e) => {
    logRequestFailure(e, 'salary-ranges');
    loadFailure.value = loadFailure.value ?? failureMessage(e, t('onboarding.weCouldntLoadThe2'));
  }).finally(() => {
    isSalaryRangesLoading.value = false;
  })
}

onMounted(loadOptions);

const showLoading = computed(() => {
  return isOccupationsLoading.value || isSalaryRangesLoading.value || customerStore.isLoaded === false || countriesStore.isLoaded === false;
})

const emit = defineEmits(['employmentUpdated', 'editPersonalInformationRequested'])

const employmentUpdated = () => {
  emit('employmentUpdated')
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
    <div v-if="loadFailure && ! showLoading" class="w-full max-w-xl">
      <div class="hidden md:block flex items-center justify-center w-full"><BrandLogo class="mb-5" /></div>
      <LoadFailurePanel :title="$t('onboarding.stepLoadFailure')" :message="loadFailure" :retryLabel="$t('common.tryAgain')" @retry="loadOptions" class="mt-0" />
    </div>
    <div v-else v-show="! showLoading" class="w-full max-w-xl">
      <!-- Logo at Top Left (Desktop)  -->
      <div class="hidden md:block flex items-center justify-center w-full">
        <a href="javascript:"><BrandLogo class="mb-5" /></a>
      </div>
      <!-- Form Header -->
      <h2 class="text-2xl font-semibold text-black mb-4 mt-14 sm:mt-8">{{ $t('onboarding.employmentDetails') }}</h2>
      <p class="text-md text-[#B7A3C1] mb-8 text-left">{{ $t('onboarding.employmentStepHint') }}</p>
      <!-- Form -->
      <CustomerAttributeForm
          v-bind:categories="`${CustomerAttributeCategory.EMPLOYMENT}`"
          v-bind:showLoading="showLoading"
          v-bind:occupations="occupations"
          v-bind:currencySalaryRange="currencySalaryRange"
          v-on:customer:attribute_category:updated="employmentUpdated"
      />
      <div class="text-center mt-12">
        <a @click="editPersonalInformation" class="inline-flex items-center rounded-full px-3 py-1.5 text-sm/6 font-medium text-brand-700 transition-colors hover:bg-brand-50 hover:underline" href="javascript:">{{ $t('onboarding.editPersonalInformation') }}</a>
      </div>
    </div>
  </div>
</template>
