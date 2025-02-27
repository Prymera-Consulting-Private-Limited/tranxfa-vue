<script setup>
import {onMounted, ref} from "vue";
import {useCustomerStore} from "@/stores/customer.js";
import VOtpInput from "vue3-otp-input";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useNavigationUtils} from "@/composables/navigation_utils.js";
import {useMachine} from "@xstate/vue";
import {onboardingNavigationMachine} from "@/machines/onboarding_navigation_machine.js";
import pTimeout from 'p-timeout';

const emailVerificationCode = ref('');
const isLoading = ref(false);
const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();
const otpError = ref('');
const { snapshot, send } = useMachine(onboardingNavigationMachine);
const navUtils = useNavigationUtils(snapshot, send)

async function verifyEmailAddress() {
  isLoading.value = true;
  await customerUtils.verifyEmail(emailVerificationCode.value).catch((e) => {
    if (e.status === 422) {
      otpError.value = e.response.data.message;
    } else if (e.status === 403) {
      customerUtils.refresh();
    }
    console.error(e);
  }).finally(() => {
    navUtils.redirectOnboarding(customerUtils.customer);
    isLoading.value = false;
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
  isLoading.value = true;
  customerUtils.resendEmailVerification().catch(async (e) => {
    if (e.status === 403) {
      await customerUtils.refresh();
      await navUtils.redirectOnboarding(customerUtils.customer);
    }
  }).finally(() => {
    isLoading.value = false;
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
  <main>
    <div class="relative flex items-center justify-center min-h-screen bg-gray-50 tracking-wider">
      <i v-if="isLoading" class="pi pi-spin pi-spinner text-5xl text-purple-700 bg-white/10"></i>
      <div v-else class="relative flex flex-col md:flex-row w-full h-screen bg-white">
        <div class=" w-[60%] md:w-[60%] h-auto md:h-full">
          <img src="/images/backgrounds/login.png" alt="Login Background" class="w-full h-90 md:h-full object-cover hidden md:block">
          <!-- Logo and Cross in Mobile View -->
          <div class="absolute top-4 left-4 md:hidden flex items-center justify-between w-full px-4">
            <a href="javascript:"><img src="/images/logo.png" alt="Tranxfa Logo" class="w-auto max-w-sm"></a>
          </div>
        </div>

        <!-- Form Section -->
        <div class="flex-1 flex items-center justify-center p-4 md:p-8">
          <div class="w-full max-w-xl">
            <!-- Logo at Top Left (Desktop)  -->
            <div class="hidden md:block flex items-center justify-center w-full">
              <a href="javascript:"><img src="/images/logo.png" alt="Tranxfa Logo" class="w-auto max-w-sm"></a>
            </div>
            <!-- Form Header -->
            <h2 class="text-2xl font-semibold text-black mb-4 text-center">Verify your Email!</h2>
            <p class="text-md text-[#B7A3C1] mb-8 text-center">We have sent an email verification code to your email {{ customerStore.customer?.account?.email }}</p>
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
                <button type="submit" class="block w-full bg-purple-700 text-white text-center py-3  rounded-[10px] font-medium hover:bg-purple-800 transition cursor-pointer">Verify Email</button>
              </div>
              <div class="text-sm text-gray-500 text-center">Didn't receive verification code? <a @click="resend" class="text-purple-600 hover:text-purple-800 hover:underline cursor-pointer" v-if="showResendButton">Resend code</a> <template v-else>Resend in {{ countdown }}s</template>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </main>
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