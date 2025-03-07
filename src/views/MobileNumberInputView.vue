<script setup>
import {onMounted, reactive, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useNavigationUtils} from "@/composables/navigation_utils.js";
import {useMachine} from "@xstate/vue";
import {onboardingNavigationMachine} from "@/machines/onboarding_navigation_machine.js";
import MobileNumberInput from "@/components/CustomerAttribute/MobileNumberInput.vue";

const customerUtils = useCustomerUtils();
const { snapshot, send } = useMachine(onboardingNavigationMachine);
const navUtils = useNavigationUtils(snapshot, send)

const isLoading = ref(true);
const mobile = reactive({
  number: null,
  country: null,
});
const errors = ref({});

onMounted(async () => {
  isLoading.value = false;
});

function mobileNumberUpdated(updated) {
  mobile.number = updated?.number;
  mobile.country = updated?.country;
}

async function updateMobileNumber() {
  isLoading.value = true;
  await customerUtils.updateMobileNumber(mobile.country, mobile.number).catch((e) => {
    if (e.status === 422) {
      errors.value = e.response.data.errors;
    } else {
      console.error(e);
    }
  }).finally(() => {
    navUtils.redirectOnboarding(customerUtils.customer)
    isLoading.value = false;
  });
}
</script>

<template>
  <main>
    <div class="flex items-center justify-center min-h-screen bg-gray-50 tracking-wider">
      <i v-show="isLoading" class="pi pi-spin pi-spinner text-5xl text-brand-700"></i>
      <div v-show="! isLoading" class="relative flex flex-col md:flex-row w-full h-screen bg-white">
        <div class=" w-[60%] md:w-[60%] h-auto md:h-full">
          <img src="/images/backgrounds/login.png" alt="Login Background" class="w-full h-90 md:h-full object-cover hidden md:block">
          <div class="absolute top-4 left-4 md:hidden flex items-center justify-between w-full px-4">
            <a href="javascript:"><img src="/images/logo.png" alt="Tranxfa Logo" class="w-auto max-w-sm"></a>
          </div>
        </div>
        <div class="flex-1 flex items-center justify-center p-4 md:p-8">
          <div class="w-full max-w-xl">
            <div class="hidden md:block flex items-center justify-center w-full">
              <a href="javascript:"><img src="/images/logo.png" alt="Tranxfa Logo" class="w-auto max-w-sm"></a>
            </div>
            <h2 class="text-2xl font-semibold text-black mb-4 text-left">Enter Your Mobile Number</h2>
            <p class="text-md text-[#B7A3C1] mb-8 text-left">Please provide your mobile number along with the ISD code to continue.</p>
            <!-- Form -->
            <form @submit.prevent="updateMobileNumber" class="space-y-6 mt-12">
              <MobileNumberInput v-bind:mobile="mobile" v-bind:errors="errors" v-on:update:mobileNumberUpdated="mobileNumberUpdated" />
              <button type="submit" class="block w-full bg-brand-700 text-white text-center py-3 rounded-[10px] font-medium hover:bg-brand-800 transition cursor-pointer">Continue</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>