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
const emit = defineEmits(['emailVerified']);

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
      emit('emailVerified');
    } else {
      console.error(e);
      throw e;
    }
  }).finally(() => {
    isLoading.value = false;
    isVerifying.value = false;
  });
  emit('emailVerified');
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
  <div class="relative flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-4 md:items-center md:p-8">
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white/75 z-10">
      <i class="pi pi-spin pi-spinner text-5xl text-brand-700"></i>
    </div>
    <div v-show="! isLoading || isVerifying" class="w-full max-w-xl">
      <!-- Logo at Top Left (Desktop)  -->
      <div class="hidden md:block flex items-center justify-center w-full">
        <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-h-16 mb-5 mx-auto"></a>
      </div>
      <!-- Form Header -->
      <h2 class="text-2xl font-semibold text-black mb-4 text-center">Verify your Email!</h2>
      <p class="text-md text-[#B7A3C1] mb-2 text-center">We have sent an email verification code to your email {{ customer.data?.account?.email }}</p>
      <p class="text-sm text-[#B7A3C1] mb-8 text-center lg:px-12">Please note, it may take up to a minute for the email to arrive. If you don't see it in your inbox, be sure to check your Junk or Spam folder as well.</p>
      <!-- Form -->
      <form @submit.prevent="verifyEmailAddress" class="space-y-10">
        <div v-if="otpError" class="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
          <p class="text-sm text-red-700">{{ otpError }}</p>
        </div>
        <v-otp-input
            class="flex flex-row items-center justify-between w-full max-w-md space-x-3 mx-auto"
            input-classes="w-12 h-12 lg:w-16 lg:h-16 flex flex-col items-center justify-center text-center px-3 lg:px-5 border border-gray-300 rounded-2xl text-lg otp-input transition-all focus:border-brand-700 focus:ring-4 focus:ring-brand-700/10"
            separator=""
            inputType="number"
            inputmode="numeric"
            :num-inputs="6"
            v-model:value="emailVerificationCode"
            :should-auto-focus="true"
            :should-focus-order="true"
            :placeholder="['*', '*', '*', '*', '*', '*']"
            @on-complete="verifyEmailAddress"
        />
        <div class="mt-6 max-w-md flex justify-between mx-auto">
          <button
            :disabled="isLoading"
            type="submit"
            class="group relative block w-full overflow-hidden rounded-full bg-brand-700 py-3.5 text-center text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-800 hover:shadow-md active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
          >
            <template v-if="isVerifying">
              <span class="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                <Spinner :class="'size-4'" />
                Verifying Email ...
              </span>
            </template>
            <template v-else>
              <span class="inline-flex items-center justify-center gap-2">
                Verify Email
                <i class="pi pi-arrow-right text-sm transition-transform duration-200 group-hover:translate-x-0.5"></i>
              </span>
            </template>
          </button>
        </div>
        <template v-if="! isLoading && ! isVerifying">
          <div v-if="! isResendingToken" class="text-sm text-gray-500 text-center">
            Didn't receive verification code?
            <a
              v-if="showResendButton"
              @click="resend"
              class="ml-1 inline-flex cursor-pointer items-center rounded-full px-2 py-0.5 font-medium text-brand-700 transition-colors hover:bg-brand-50 hover:underline"
            >Resend code</a>
            <template v-else> Resend in {{ countdown }}s</template>
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