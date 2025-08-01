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
  <div class="relative flex-1 flex items-center justify-center p-4 md:p-8">
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white/75 z-10">
      <i class="pi pi-spin pi-spinner text-5xl text-brand-700"></i>
    </div>
    <div v-show="! isLoading || isSaving" class="w-full max-w-xl">
      <!-- Logo at Top Left (Desktop)  -->
      <div class="hidden md:block flex items-center justify-center w-full">
        <a href="javascript:"><img src="/images/logo.png" alt="VeloxPays Logo" class="max-w-64 max-h-10 mb-5"></a>
      </div>
      <!-- Form Header -->
      <h2 class="text-2xl font-semibold text-black mb-4 text-left  mt-14 sm:mt-8">Where Do You Live?</h2>
      <p class="text-md text-[#B7A3C1] mb-8 text-left">To provide you with the best service, we need to know your country of residence. Please select your country to continue.</p>
      <ul v-if="countryUtils.sources.value?.length > 0" role="list" class="mt-3 grid grid-cols-1 gap-5 xl:grid-cols-2 sm:gap-6">
        <template v-for="country in countryUtils.sources.value" :key="country.id">
          <li @click="updateCountry(country)" class="col-span-1 flex rounded-md shadow-xs cursor-pointer">
            <div class="flex px-5 font- shrink-0 items-center justify-center rounded-l-md border-t border-l border-b border-gray-200 bg-white">
              <FlagIcon :class="['text-2xl']" :code="country.iso2Alpha.toLowerCase()" circle  />
            </div>
            <div class="flex flex-1 items-center justify-between truncate rounded-r-md border-t border-r border-b border-gray-200 bg-white">
              <div class="flex-1 truncate px-5 pl-0 py-2 text-sm">
                <p class="font-medium text-gray-900 truncate">{{ country.commonName }}</p>
                <p class="text-gray-500 truncate">{{ country.endonym ?? country.officialName }}</p>
              </div>
            </div>
          </li>
        </template>
      </ul>
      <ul v-else role="list" class="mt-3 grid grid-cols-1 gap-5 xl:grid-cols-2 sm:gap-6">
        <template v-for="i in 4" :key="i">
          <li class="col-span-1 flex rounded-md">
            <div class="flex px-5 py-3 font- shrink-0 items-center justify-center rounded-l-md border-t border-l border-b border-gray-200 bg-white">
              <span class="size-10 bg-gray-200 animate-pulse rounded-full"></span>
            </div>
            <div class="flex flex-1 items-center justify-between truncate rounded-r-md border-t border-r border-b border-gray-200 bg-white">
              <div class="flex-1 truncate px-5 pl-0 py-2 text-sm">
                <div class="w-24 h-4 bg-gray-200 animate-pulse"></div>
                <div class="w-16 h-2 mt-2 bg-gray-200 animate-pulse"></div>
              </div>
            </div>
          </li>
        </template>
      </ul>
    </div>
  </div>
</template>