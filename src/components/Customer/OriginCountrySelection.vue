<script setup>
import {onMounted, ref} from "vue";
import {useCountryUtils} from "@/composables/country_utils.js";
import FlagIcon from "vue3-flag-icons";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";

const customerStore = useCustomerStore();
const countryUtils = useCountryUtils();
const customerUtils = useCustomerUtils();

const isLoading = ref(true);
const isSaving = ref(false);
const emit = defineEmits(['countryUpdated']);

async function updateCountry(country) {
  isLoading.value = true;
  isSaving.value = true;
  await customerUtils.updateCountry(country);
  emit('countryUpdated');
}
onMounted(async () => {
  if (! customerStore.isLoaded) {
    await customerUtils.refresh();
  }
  await countryUtils.getSources().finally(() => {
    isLoading.value = false;
  });
});
</script>

<template>
  <div class="relative flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-4 md:items-center md:p-8">
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white/75 z-10">
      <i class="pi pi-spin pi-spinner text-5xl text-brand-700"></i>
    </div>
    <div v-show="! isLoading || isSaving" class="w-full max-w-xl">
      <!-- Logo at Top Left (Desktop)  -->
      <div class="hidden md:block">
        <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-h-16 mb-5 -ml-2"></a>
      </div>
      <!-- Form Header -->
      <h2 class="text-2xl font-semibold text-black mb-4 text-left">Where Do You Live?</h2>
      <p class="text-md text-[#B7A3C1] mb-8 text-left">To provide you with the best service, we need to know your country of residence. Please select your country to continue.</p>
      <ul v-if="countryUtils.sources.value?.length > 0" role="list" class="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-2 sm:gap-5">
        <template v-for="country in countryUtils.sources.value" :key="country.id">
          <li
            @click="updateCountry(country)"
            class="col-span-1 flex cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs transition-all duration-200 hover:border-brand-300 hover:shadow-md hover:ring-4 hover:ring-brand-700/10 active:scale-[0.99]"
          >
            <div class="flex shrink-0 items-center justify-center bg-white px-5">
              <FlagIcon :class="['text-2xl']" :code="country.iso2Alpha.toLowerCase()" circle  />
            </div>
            <div class="flex min-w-0 flex-1 items-center justify-between truncate py-3 pr-4">
              <div class="min-w-0 flex-1 truncate text-sm">
                <p class="truncate font-medium text-gray-900">{{ country.commonName }}</p>
                <p class="truncate text-gray-500">{{ country.endonym ?? country.officialName }}</p>
              </div>
            </div>
          </li>
        </template>
      </ul>
      <ul v-else role="list" class="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-2 sm:gap-5">
        <template v-for="i in 4" :key="i">
          <li class="col-span-1 flex overflow-hidden rounded-2xl border border-gray-200">
            <div class="flex shrink-0 items-center justify-center bg-white px-5 py-3">
              <span class="size-10 animate-pulse rounded-full bg-gray-200"></span>
            </div>
            <div class="flex min-w-0 flex-1 items-center justify-between truncate bg-white py-3 pr-4">
              <div class="min-w-0 flex-1 truncate text-sm">
                <div class="h-4 w-24 animate-pulse bg-gray-200"></div>
                <div class="mt-2 h-2 w-16 animate-pulse bg-gray-200"></div>
              </div>
            </div>
          </li>
        </template>
      </ul>
    </div>
  </div>
</template>