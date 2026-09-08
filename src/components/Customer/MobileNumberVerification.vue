<script setup>
import BrandLogo from "@/components/BrandLogo.vue";
import {onMounted, ref} from "vue";
import VOtpInput from "vue3-otp-input";
import pTimeout from 'p-timeout';
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCustomerStore} from "@/stores/customer.js";
import Spinner from "@/components/Spinner.vue";

// The mobile counterpart of EmailVerification, reached only when the
// deployment sets VITE_ONBOARDING_VERIFY_MOBILE_NUMBER. The API has supported
// this all along; nothing in the SPA used it until now.

const verificationCode = ref('');
const isLoading = ref(false);
const isVerifying = ref(false);
const isResendingToken = ref(false);
const otpError = ref('');
const customerUtils = useCustomerUtils();
const customerStore = useCustomerStore();
const emit = defineEmits(['mobileNumberVerified', 'editMobileNumberRequested']);

/**
 * @type {{data: Customer | null}}
 */
const customer = customerStore.customer;

async function verifyMobileNumber() {
  isLoading.value = true;
  isVerifying.value = true;
  otpError.value = '';
  await customerUtils.verifyMobileNumber(verificationCode.value).catch((e) => {
    if (e.status === 422) {
      otpError.value = e.response.data.message;

      return;
    }
    // 403 means the number is already verified - refresh and move on rather
    // than stranding the customer on a step they have finished.
    if (e.status === 403) {
      customerUtils.refresh();
      emit('mobileNumberVerified');

      return;
    }
    console.error(e);
    throw e;
  }).finally(() => {
    isLoading.value = false;
    isVerifying.value = false;
  });

  if (! otpError.value) {
    emit('mobileNumberVerified');
  }
}

const showResendButton = ref(false);
const countdown = ref(30);

async function startResendOtpTimer() {
  showResendButton.value = false;
  countdown.value = 30;

  try {
    const timer = new Promise((resolve) => {
      const interval = setInterval(() => {
        countdown.value -= 1;
        if (countdown.value === 0) {
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });

    await pTimeout(timer, {milliseconds: 30000});
    showResendButton.value = true;
  } catch (error) {
    console.error(error);
  }
}

async function resend() {
  isResendingToken.value = true;
  await customerUtils.resendMobileVerification().catch((e) => {
    console.error(e);
  }).finally(() => {
    isResendingToken.value = false;
  });

  await startResendOtpTimer();
}

onMounted(async () => {
  await startResendOtpTimer();
});
</script>

<template>
  <div class="relative flex-1 flex items-center justify-center p-4 md:p-8">
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white/75 z-10">
      <i class="pi pi-spin pi-spinner text-5xl text-brand-700"></i>
    </div>
    <div v-show="! isLoading || isVerifying" class="w-full max-w-xl">
      <div class="hidden md:block flex items-center justify-center w-full">
        <a href="javascript:" class="mx-auto"><BrandLogo class="mb-5 mx-auto" /></a>
      </div>
      <h2 class="text-2xl font-semibold text-black mb-4 text-center mt-14 sm:mt-8">Verify your mobile number</h2>
      <p class="text-md text-gray-500 mb-2 text-center">
        Please enter the one time password we have sent to
        <span class="font-semibold text-brand-700">{{ customer.data?.account?.mobileNumber }}</span>.
      </p>
      <p class="text-sm text-gray-500 mb-8 text-center lg:px-12">
        It can take up to a minute to arrive.
      </p>

      <form @submit.prevent="verifyMobileNumber" class="space-y-10">
        <div v-if="otpError" class="rounded-md bg-red-50 p-4">
          <div class="text-sm text-red-700">{{ otpError }}</div>
        </div>
        <v-otp-input
            class="flex flex-row items-center justify-between w-full max-w-md space-x-3 mx-auto"
            input-classes="w-12 h-12 lg:w-16 lg:h-16 flex flex-col items-center justify-center text-center px-3 lg:px-5 border-b border border-gray-300 rounded-lg text-lg otp-input"
            separator=""
            inputType="number"
            inputmode="numeric"
            :num-inputs="6"
            v-model:value="verificationCode"
            :should-auto-focus="true"
            :should-focus-order="true"
            :placeholder="['*', '*', '*', '*', '*', '*']"
            @on-complete="verifyMobileNumber"
        />
        <div class="mt-6 max-w-md flex justify-between mx-auto">
          <button :disabled="isLoading" :class="[{'opacity-70': isLoading}]" type="submit" class="block w-full bg-brand-700 text-white text-center py-3 rounded-xl font-medium hover:bg-brand-800 transition cursor-pointer">
            <template v-if="isVerifying">
              <span class="flex items-center justify-center whitespace-nowrap">
                <Spinner :class="'size-4 mr-2'" />
                Please wait...
              </span>
            </template>
            <template v-else>Verify</template>
          </button>
        </div>
        <template v-if="! isLoading && ! isVerifying">
          <div v-if="! isResendingToken" class="text-sm text-gray-500 text-center">
            Didn't receive the code?
            <a @click="resend" class="text-brand-700 hover:underline cursor-pointer" v-if="showResendButton">Resend code</a>
            <template v-else>Resend in {{ countdown }}s</template>
          </div>
          <div v-else class="text-sm text-gray-500 text-center animate-pulse">Resending the code ...</div>
          <div class="text-sm text-gray-500 text-center">
            Wrong number?
            <a @click="emit('editMobileNumberRequested')" class="text-brand-700 hover:underline cursor-pointer">Change it</a>
          </div>
        </template>
      </form>
    </div>
  </div>
</template>

<style scoped>
.otp-input::-webkit-inner-spin-button,
.otp-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input::placeholder {
  font-size: 15px;
  text-align: center;
  font-weight: 600;
}
</style>
