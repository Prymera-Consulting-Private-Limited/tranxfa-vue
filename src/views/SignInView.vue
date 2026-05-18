<script setup>
import {reactive, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import router from "@/router/index.js";
import axios from "axios";
import MobileNumberInput from "@/components/CustomerAttribute/MobileNumberInput.vue";
import {cleanNationalMobileNumber} from "@/composables/mobile_utils.js";
import {useOtpAuthContextStore} from "@/stores/otp_auth_context.js";

const customerUtils = useCustomerUtils();
const otpContext = useOtpAuthContextStore();

const mobile = reactive({
  country: null,
  number: null,
});

const formErrors = reactive({
  country: [],
  mobile_number: [],
  mobile_number_country_id: [],
});

const isLoading = ref(false);
const loginError = ref(null);

function onMobileNumberUpdated(payload) {
  mobile.country = payload.country;
  mobile.number = payload.number;
}

function clearFieldErrors() {
  formErrors.country = [];
  formErrors.mobile_number = [];
  formErrors.mobile_number_country_id = [];
}

async function requestOtp() {
  loginError.value = null;
  clearFieldErrors();
  const cleaned = cleanNationalMobileNumber(mobile.number);
  if (!mobile.country) {
    loginError.value = 'Please select your country.';
    return;
  }
  if (cleaned.length < 6) {
    loginError.value = 'Please enter a valid mobile number.';
    return;
  }

  isLoading.value = true;
  await axios.get('/sanctum/csrf-cookie');
  await customerUtils.requestLoginOtp(mobile.country, cleaned).then(() => {
    otpContext.setContext('login', mobile.country, cleaned);
    router.push({ name: 'otpAuthentication' });
  }).catch((e) => {
    const status = e.response?.status;
    if (status === 422) {
      const errors = e.response?.data?.errors || {};
      if (errors.country) formErrors.country = errors.country;
      if (errors.mobile_number) formErrors.mobile_number = errors.mobile_number;
      if (errors.mobile_number_country_id) formErrors.mobile_number_country_id = errors.mobile_number_country_id;
      loginError.value = e.response?.data?.message;
    } else if (status === 429) {
      loginError.value = 'Too many requests. Please try again later.';
    } else if (status === 401) {
      loginError.value = e.response?.data?.message || 'Unauthorized.';
    } else {
      loginError.value = e.response?.data?.message;
      console.error(e);
    }
  }).finally(() => {
    isLoading.value = false;
  });
}

const appUrl = import.meta.env.VITE_APP_URL;
</script>
<template>
  <main>
    <div class="relative flex items-center justify-center min-h-screen bg-gray-50 tracking-wider">
      <i v-if="isLoading" class="pi pi-spin pi-spinner text-5xl text-brand-700 bg-white/10"></i>
      <div v-else class="relative flex flex-col md:flex-row w-full h-screen bg-white">
        <div class=" w-[60%] md:w-[60%] h-auto md:h-full">
          <img src="/images/backgrounds/login.png" alt="Login Background" class="w-full h-90 md:h-full object-cover hidden md:block">
          <div class="absolute top-4 left-4 md:hidden flex items-center justify-between w-full px-4">
            <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-w-64 max-h-10 mb-5"></a>
            <a :href="appUrl" class="text-gray-400 text-3xl hover:text-gray-500 pr-5">
              <i class="pi pi-times"></i>
            </a>
          </div>
          <div class="hidden md:block  absolute top-4 right-4">
            <a :href="appUrl" class="text-gray-400 text-3xl hover:text-gray-500 pr-5">
              <i class="pi pi-times"></i>
            </a>
          </div>
        </div>

        <div class="flex-1 flex items-center justify-center p-4 md:p-8">
          <div class="w-full max-w-xl">
            <div class="hidden md:block">
              <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-h-16 mb-5 -ml-2"></a>
            </div>
            <h2 class="text-2xl font-bold text-black mb-2">Love to see you again</h2>
            <p class="text-sm text-[#B7A3C1] mb-6 ">Send your money transfer easy and Fun!</p>
            <form @submit.prevent="requestOtp" class="space-y-6">
              <div v-if="loginError" class="rounded-md bg-red-50 p-4">
                <div class="flex">
                  <div class="">
                    <h3 class="text-sm font-medium text-red-800">Something went wrong</h3>
                    <div class="mt-2 text-sm text-red-700">
                      {{ loginError }}
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="router.currentRoute.value.query?.referer" class="rounded-md bg-blue-50 p-4">
                <div class="flex">
                  <div class="">
                    <div v-if="router.currentRoute.value.query.referer === 'change-password'" class="text-sm text-blue-700">
                      Your password has been successfully changed. Please log in using your new password.
                    </div>
                    <div v-if="router.currentRoute.value.query.referer === 'reset-password'" class="text-sm text-blue-700">
                      Your password has been successfully reset. Please log in using your new password.
                    </div>
                  </div>
                </div>
              </div>

              <MobileNumberInput
                  :mobile="mobile"
                  :errors="formErrors"
                  @update:mobileNumberUpdated="onMobileNumberUpdated"
              />

              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center">
                  <input id="remember-me" type="checkbox" class="w-4 h-4 text-brand-700 border-gray-300 rounded focus:ring-brand-700 focus:ring-0 outline-none accent-brand-700">
                  <label for="remember-me" class="ml-2 text-sm text-gray-600">Remember me</label>
                </div>
              </div>

              <button :disabled="isLoading" :class="{'opacity-70': isLoading}" type="submit" class="block w-full bg-brand-700 text-white text-center py-3  rounded-[10px] font-medium hover:bg-brand-800 transition cursor-pointer">Continue</button>
              <p class="mt-4 text-center text-sm text-gray-600">
                Don’t have an account? <router-link :to="{name: 'signUp'}" class="text-brand-700 hover:text-brand-700 hover:underline">Sign up instead</router-link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
