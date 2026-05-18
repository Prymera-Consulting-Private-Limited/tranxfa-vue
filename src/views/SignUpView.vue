<script setup>
import {computed, reactive, ref} from "vue";
import router from "@/router/index.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import axios from "axios";
import MobileNumberInput from "@/components/CustomerAttribute/MobileNumberInput.vue";
import {cleanNationalMobileNumber} from "@/composables/mobile_utils.js";
import {useOtpAuthContextStore} from "@/stores/otp_auth_context.js";

const thirdPartyDeclaration = import.meta.env.VITE_THIRD_PARTY_SIGNUP_DECLARATION;
const thirdPartyDeclarationAccepted = ref(false);
const isLoading = ref(false);
const termsAccepted = ref(false);
const signupError = ref(null);

const mobile = reactive({
  country: null,
  number: null,
});

const formErrors = reactive({
  country: [],
  mobile_number: [],
  mobile_number_country_id: [],
});

const customerUtils = useCustomerUtils();
const otpContext = useOtpAuthContextStore();

function onMobileNumberUpdated(payload) {
  mobile.country = payload.country;
  mobile.number = payload.number;
}

function clearFieldErrors() {
  formErrors.country = [];
  formErrors.mobile_number = [];
  formErrors.mobile_number_country_id = [];
}

async function submitSignupMobileOtp() {
  signupError.value = null;
  isLoading.value = true;
  clearFieldErrors();
  const cleaned = cleanNationalMobileNumber(mobile.number);
  if (!mobile.country) {
    signupError.value = 'Please select your country.';
    isLoading.value = false;
    return;
  }
  if (cleaned.length < 6) {
    signupError.value = 'Please enter a valid mobile number.';
    isLoading.value = false;
    return;
  }

  await axios.get('/sanctum/csrf-cookie');
  const signupOptions = {};
  if (thirdPartyDeclaration) {
    signupOptions.third_party_declaration_accepted = thirdPartyDeclarationAccepted.value;
  }
  await customerUtils.requestSignupOtp(mobile.country, cleaned, signupOptions).then(() => {
    otpContext.setContext('signup', mobile.country, cleaned);
    router.push({ name: 'otpAuthentication' });
  }).catch((e) => {
    const status = e.response?.status;
    if (status === 422) {
      const errors = e.response?.data?.errors || {};
      if (errors.country) formErrors.country = errors.country;
      if (errors.mobile_number) formErrors.mobile_number = errors.mobile_number;
      if (errors.mobile_number_country_id) formErrors.mobile_number_country_id = errors.mobile_number_country_id;
      signupError.value = e.response?.data?.message;
    } else if (status === 429) {
      signupError.value = 'Too many requests. Please try again later.';
    } else if (status === 401) {
      signupError.value = e.response?.data?.message || 'Unauthorized.';
    } else {
      signupError.value = e.response?.data?.message;
      console.error(e);
    }
  }).finally(() => {
    isLoading.value = false;
  });
}

const termsOfServiceUrl = import.meta.env.VITE_TERMS_OF_SERVICE_URL;
const privacyPolicyUrl = import.meta.env.VITE_PRIVACY_POLICY_URL;
const appUrl = import.meta.env.VITE_APP_URL;

const canContinue = computed(() => {
  if (!termsAccepted.value || isLoading.value) return false;
  if (thirdPartyDeclaration && !thirdPartyDeclarationAccepted.value) return false;
  const cleaned = cleanNationalMobileNumber(mobile.number);
  if (!mobile.country || cleaned.length < 6) return false;
  return true;
});
</script>

<template>
  <main>
    <div class="flex items-center justify-center min-h-screen bg-gray-50 tracking-wider">
      <i v-if="isLoading" class="pi pi-spin pi-spinner text-5xl text-brand-700"></i>
      <div v-else class="relative flex flex-col md:flex-row w-full h-screen bg-white">
        <div class=" w-[60%] md:w-[60%] h-auto md:h-full">
          <img src="/images/backgrounds/signup.png" alt="Full Size Image" class="w-full h-90 md:h-full object-cover hidden md:block">
          <div class="absolute top-4 left-4 md:hidden flex items-center justify-between w-full px-4">
            <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-w-64 max-h-10 mb-5"></a>
            <a :href="appUrl" class="text-gray-400 text-3xl hover:text-gray-500 pr-5">
              <i class="pi pi-times"></i>
            </a>
          </div>
          <div class="hidden md:block  absolute top-4 right-4">
            <a :href="appUrl" class="text-gray-400 text-3xl hover:text-gray-500 ">
              <i class="pi pi-times"></i>
            </a>
          </div>
        </div>

        <div class="flex-1 flex items-center justify-center p-4 md:p-16 pt-[100px] sm:pt-0">
          <div class="w-full max-w-xl">
            <div class="hidden md:block">
              <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-w-64 max-h-16 mb-5"></a>
            </div>
            <h2 class="text-2xl font-bold text-black mb-2">
              Adventure starts here
              <img src="/images/rocket.gif" alt="Verified" class="w-8 h-8 inline-block">
            </h2>
            <p class="text-sm text-[#B7A3C1] mb-6 ">Make your money transfer easy and Fun!</p>

            <form @submit.prevent="submitSignupMobileOtp" class="space-y-6">
              <div v-if="signupError" class="rounded-md bg-red-50 p-4">
                <div class="text-sm text-red-700">{{ signupError }}</div>
              </div>
              <MobileNumberInput
                  :mobile="mobile"
                  :errors="formErrors"
                  @update:mobileNumberUpdated="onMobileNumberUpdated"
              />

              <div class="flex items-start space-x-2">
                <input type="checkbox" id="terms" v-model="termsAccepted" class="mt-0.5 w-4 h-4 min-w-4 min-h-4 text-brand-700 border-gray-300 rounded focus:ring-brand-700 focus:ring-0 outline-none accent-brand-700" />
                <label for="terms" class="text-sm/6 text-gray-700 leading-snug">I agree to <a :href="privacyPolicyUrl" target="_blank" class="text-brand-700 hover:text-brand-800 hover:underline">privacy policy</a> & <a :href="termsOfServiceUrl" target="_blank" class="text-brand-700 hover:text-brand-800 hover:underline">terms of service</a>.</label>
              </div>

              <div v-if="thirdPartyDeclaration" class="flex items-start space-x-2">
                <input type="checkbox" id="third-party-declaration-accepted" v-model="thirdPartyDeclarationAccepted" class="mt-1 w-4 h-4 min-w-4 min-h-4 text-brand-700 border-gray-300 rounded focus:ring-brand-700 focus:ring-0 outline-none accent-brand-700" />
                <label for="third-party-declaration-accepted" class="text-sm/6 text-gray-700">{{ thirdPartyDeclaration }}</label>
              </div>
              <button :disabled="!canContinue" :class="[canContinue ? 'hover:bg-brand-800 transition cursor-pointer' : 'opacity-60 cursor-not-allowed']" type="submit" class="block w-full bg-brand-700 text-center py-3 font-medium text-white rounded-[10px]">Continue</button>
            </form>

            <p class="text-sm text-gray-500 mt-10 text-center">
              Already have an account? <router-link class="text-brand-700 hover:text-brand-700 hover:underline" :to="{name: 'signIn'}">Sign in instead</router-link>
            </p>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
