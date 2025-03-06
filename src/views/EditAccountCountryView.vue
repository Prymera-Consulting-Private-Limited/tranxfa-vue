<script setup>
import {onMounted, ref} from "vue";
import {useCountryUtils} from "@/composables/country_utils.js";
import FlagIcon from "vue3-flag-icons";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useNavigationUtils} from "@/composables/navigation_utils.js";
import {useMachine} from "@xstate/vue";
import {onboardingNavigationMachine} from "@/machines/onboarding_navigation_machine.js";

const customerStore = useCustomerStore();
const countryUtils = useCountryUtils();
const customerUtils = useCustomerUtils();
const { snapshot, send } = useMachine(onboardingNavigationMachine);
const navUtils = useNavigationUtils(snapshot, send)

const isLoading = ref(true);
async function updateCountry(country) {
  isLoading.value = true;
  await customerUtils.updateCountry(country).finally(() => {
    isLoading.value = false;
    navUtils.redirectOnboarding(customerUtils.customer);
  });
}
onMounted(async () => {
  if (! customerStore.isLoaded) {
    isLoading.value = true;
    await customerUtils.refresh();
    isLoading.value = false;
  }
  isLoading.value = true;
  await countryUtils.getSources().finally(() => {
    isLoading.value = false;
  });
});
</script>

<template>
  <main>
    <div class="flex items-center justify-center min-h-screen bg-gray-50 tracking-wider">
      <i v-if="isLoading || countryUtils.sources.value.length === 0" class="pi pi-spin pi-spinner text-5xl text-purple-700"></i>
      <div v-else class="relative flex flex-col md:flex-row w-full h-screen bg-white">
        <div class=" w-[60%] md:w-[60%] h-auto md:h-full">
          <img src="/images/backgrounds/login.png" alt="Login Background" class="w-full h-90 md:h-full object-cover hidden md:block">
          <!-- Logo and Cross in Mobile View -->
          <div class="absolute top-4 left-4 md:hidden flex items-center justify-between w-full px-4">
            <a href="javascript:"><img src="/images/logo.png" alt="Tranxfa Logo" class="w-auto max-w-sm"></a>
          </div>
        </div>
        <div class="flex-1 flex items-center justify-center p-4 md:p-8">
          <div class="w-full max-w-xl">
            <!-- Logo at Top Left (Desktop)  -->
            <div class="hidden md:block flex items-center justify-center w-full">
              <a href="javascript:"><img src="/images/logo.png" alt="Tranxfa Logo" class="w-auto max-w-sm"></a>
            </div>
            <!-- Form Header -->
            <h2 class="text-2xl font-semibold text-black mb-4 text-left">Where Do You Live?</h2>
            <p class="text-md text-[#B7A3C1] mb-8 text-left">To provide you with the best service, we need to know your country of residence. Please select your country to continue.</p>
            <ul role="list" class="mt-3 grid grid-cols-1 gap-5 xl:grid-cols-2 sm:gap-6">
              <template v-for="country in countryUtils.sources.value" :key="country.id">
                <li @click="updateCountry(country)" class="col-span-1 flex rounded-md shadow-xs cursor-pointer">
                  <div class="flex px-5 font- shrink-0 items-center justify-center rounded-l-md border-t border-l border-b border-gray-200 bg-white"><FlagIcon :class="['text-2xl']" :code="country.iso2Alpha.toLowerCase()" circle  /></div>
                  <div class="flex flex-1 items-center justify-between truncate rounded-r-md border-t border-r border-b border-gray-200 bg-white">
                    <div class="flex-1 truncate px-5 pl-0 py-2 text-sm">
                      <p class="font-medium text-gray-900 truncate">{{ country.commonName }}</p>
                      <p class="text-gray-500 truncate">{{ country.endonym ?? country.officialName }}</p>
                    </div>
                  </div>
                </li>
              </template>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>