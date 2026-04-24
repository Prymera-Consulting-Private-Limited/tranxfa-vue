<script setup>
import {onMounted, ref} from "vue";
import VOtpInput from "vue3-otp-input";
import pTimeout from 'p-timeout';
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCustomerStore} from "@/stores/customer.js";
import Spinner from "@/components/Spinner.vue";
import router from "@/router/index.js";

const otp = ref('');
const isLoading = ref(false);
const isVerifying = ref(false);
const isResendingOtp = ref(false);
const otpError = ref('');
const customerUtils = useCustomerUtils();
const customerStore = useCustomerStore();

/**
 * @type {{data: Customer | null}}
 */
const customer = customerStore.customer;

async function authenticate() {
  isLoading.value = true;
  isVerifying.value = true;
  await customerUtils.mfa(otp.value).then(() => {
    router.push({name: 'onboardingWorkflow'});
  }).catch((e) => {
    if (e.response?.status === 422) {
      otpError.value = e.response.data.message;
    } else if (e.response?.status === 403) {
      customerUtils.refresh();
      router.push({name: 'onboardingWorkflow'});
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
  isResendingOtp.value = true;
  customerUtils.resendMfaOtp().catch(async (e) => {
    if (e.status === 403) {
      await customerUtils.refresh();
    }
  }).finally(() => {
    isResendingOtp.value = false;
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
  <!-- Background Wrapper -->
  <div
    class="min-h-screen flex items-center justify-center bg-no-repeat bg-center bg-cover relative"
    style="background-image: url('/images/backgrounds/login.png');"
  >
    <!-- Loader Overlay -->
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-black/20 z-20">
      <i class="pi pi-spin pi-spinner text-5xl text-white"></i>
    </div>

    <!-- Card -->
    <div class="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">

      <!-- Logo -->
      <div class="text-center mb-6">
        <img src="/images/logo.png" class="h-8 mx-auto mb-3" />
        <p class="text-xs text-gray-400">
          Secure access to your account
        </p>
      </div>

      <!-- Heading -->
      <h2 class="text-xl font-semibold text-center mb-3">
        More authentication needed
      </h2>

      <p class="text-sm text-gray-400 text-center mb-2">
        Enter the OTP sent to
        <span class="text-gray-600 font-medium">
          {{ customer.data?.account?.email }}
        </span>
      </p>

      <p class="text-xs text-gray-400 text-center mb-6 px-4">
        It may take up to a minute. Check spam/junk if needed.
      </p>

      <!-- Form -->
      <form @submit.prevent="authenticate" class="space-y-6">

        <!-- Error -->
        <div v-if="otpError" class="bg-red-50 text-red-700 text-sm p-3 rounded">
          {{ otpError }}
        </div>

        <!-- OTP Input -->
        <v-otp-input
          class="flex justify-center gap-3"
          input-classes="w-12 h-12 lg:w-14 lg:h-14 text-center border border-gray-200 rounded-lg bg-gray-100 focus:ring-2 focus:ring-teal-400 text-lg"
          separator=""
          inputType="number"
          inputmode="numeric"
          :num-inputs="6"
          v-model:value="otp"
          :should-auto-focus="true"
          :should-focus-order="true"
          :placeholder="['*', '*', '*', '*', '*', '*']"
          @on-complete="authenticate"
        />

        <!-- Button -->
        <button
          type="submit"
          class="w-full py-3 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-medium transition"
        >
          <template v-if="isVerifying">
            <span class="flex items-center justify-center">
              <Spinner class="size-4 mr-2" />
              Please wait...
            </span>
          </template>
          <template v-else>
            Verify & Continue
          </template>
        </button>

        <!-- Resend -->
        <template v-if="! isLoading && ! isVerifying">
          <div v-if="! isResendingOtp" class="text-xs text-gray-500 text-center">
            Didn’t receive OTP?
            <span
              v-if="showResendButton"
              @click="resend"
              class="text-teal-500 hover:underline cursor-pointer"
            >
              Resend code
            </span>
            <span v-else>
              Resend in {{ countdown }}s
            </span>
          </div>

          <div v-else class="text-xs text-gray-400 text-center animate-pulse">
            Resending OTP to {{ customer.data?.account?.email }}...
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