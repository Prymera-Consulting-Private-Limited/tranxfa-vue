<script setup>
import {onMounted, ref} from "vue";
import VOtpInput from "vue3-otp-input";
import pTimeout from 'p-timeout';
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCustomerStore} from "@/stores/customer.js";
import Spinner from "@/components/Spinner.vue";

const emailVerificationCode = ref('');
const isLoading = ref(false);
const isVerifying = ref(false);
const isResendingToken = ref(false);
const otpError = ref('');
const customerUtils = useCustomerUtils();
const customerStore = useCustomerStore();

/**
 * @type {{data: Customer | null}}
 */
const customer = customerStore.customer;

async function verifyEmailAddress() {
  isLoading.value = true;
  isVerifying.value = true;
  await customerUtils.verifyEmail(emailVerificationCode.value).catch((e) => {
    if (e.status === 422) {
      otpError.value = e.response.data.message;
    } else if (e.status === 403) {
      customerUtils.refresh();
    } else {
      console.error(e);
      throw e;
    }
  }).finally(() => {
    isLoading.value = false;
    isVerifying.value = false;
  });
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

    await pTimeout(timer, { milliseconds: 30000 });
    showResendButton.value = true;
  } catch (error) {
    console.log("Timeout error:", error);
  }
}

async function resend() {
  isResendingToken.value = true;
  customerUtils.resendEmailVerification().catch(async (e) => {
    if (e.status === 403) {
      await customerUtils.refresh();
    }
  }).finally(() => {
    isResendingToken.value = false;
  });

  await startResendOtpTimer();
}

onMounted(async () => {
  if (! customerStore.isLoaded) {
    isLoading.value = true;
    await customerUtils.refresh();
    isLoading.value = false;
  }
  await startResendOtpTimer();
});
</script>
<template>
  <!-- Form Section -->
  <div class="relative flex-1 flex items-center justify-center p-4 md:p-8">
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white/75 z-10">
      <i class="pi pi-spin pi-spinner text-5xl text-brand-700"></i>
    </div>
    <div v-show="! isLoading || isVerifying" class="w-full max-w-xl">
      <!-- Logo at Top Left (Desktop)  -->
      <div class="hidden md:block flex items-center justify-center w-full">
        <a href="javascript:"><img src="/images/logo.png" alt="Tranxfa Logo" class="w-auto max-w-sm"></a>
      </div>
      <!-- Form Header -->
      <h2 class="text-2xl font-semibold text-black mb-4 text-center">Verify your Email!</h2>
      <p class="text-md text-[#B7A3C1] mb-8 text-center">We have sent an email verification code to your email {{ customer.data?.account?.email }}</p>
      <!-- Form -->
      <form @submit.prevent="verifyEmailAddress" class="space-y-10">
        <div v-if="otpError" class="rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="">
              <div class="text-sm text-red-700">
                {{ otpError }}
              </div>
            </div>
          </div>
        </div>
        <v-otp-input
            class="flex flex-row items-center justify-between w-full max-w-md space-x-3 mx-auto"
            input-classes="w-16 h-16 flex flex-col items-center justify-center text-center px-5 border-b border border-gray-300 rounded-lg text-lg otp-input"
            separator=""
            inputType="number"
            :num-inputs="6"
            v-model:value="emailVerificationCode"
            :should-auto-focus="true"
            :should-focus-order="true"
            :placeholder="['*', '*', '*', '*', '*', '*']"
            @on-complete="verifyEmailAddress"
        />
        <div class="mt-6 max-w-md flex justify-between mx-auto">
          <button :disabled="isLoading" :class="[{'opacity-70': isLoading}]" type="submit" class="block w-full bg-brand-700 text-white text-center py-3  rounded-[10px] font-medium hover:bg-brand-800 transition cursor-pointer">
            <template v-if="isVerifying">
              <span class="flex items-center justify-center whitespace-nowrap">
                <Spinner :class="'size-4 mr-2'" />
                Verifying Email ...
              </span>
            </template>
            <template v-else>Verify Email</template>
          </button>
        </div>
        <template v-if="! isLoading && ! isVerifying">
          <div v-if="! isResendingToken" class="text-sm text-gray-500 text-center">Didn't receive verification code? <a @click="resend" class="text-brand-600 hover:text-brand-800 hover:underline cursor-pointer" v-if="showResendButton">Resend code</a> <template v-else>Resend in {{ countdown }}s</template>
          </div>
          <div v-else class="text-sm text-gray-500 text-center animate-pulse">Resending verification code to your email {{ customer.data?.account?.email }} ...</div>
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