<script setup>
import {failureMessage, logRequestFailure} from "@/composables/api_utils.js";
import BrandLogo from "@/components/BrandLogo.vue";
import {onMounted, ref} from "vue";
import VOtpInput from "vue3-otp-input";
import pTimeout from 'p-timeout';
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCustomerStore} from "@/stores/customer.js";
import Spinner from "@/components/Spinner.vue";
import router from "@/router/index.js";
import {safeRedirect} from "@/router/guards.js";

// The redirect sign-in was carrying, if it is still a path on this site.
const onward = () => {
  const redirect = safeRedirect(router.currentRoute.value.query.redirect);
  return redirect ? {redirect} : {};
};

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
const otpData = JSON.parse(
    sessionStorage.getItem('otpData') || '{}'
)

const country = otpData.country
const number = otpData.number

// A refresh or a deep link lands here with nothing in session storage; the
// form would then throw on the first submit. Send them back to start over.
onMounted(() => {
  if (! country?.id || ! number) {
    router.replace({name: 'signIn'});
  }
});
async function authenticate() {
  isLoading.value = true;
  isVerifying.value = true;
  await customerUtils.loginWithMobileNumber(country.id, number, otp.value).then(() => {
    router.push({name: 'onboardingWorkflow', query: onward()});
  }).catch((e) => {
    if (e.response?.status === 422 || e.response?.status === 401) {
      otpError.value = e.response.data.message;
    } else {
      logRequestFailure(e, 'otp-sign-in');
      otpError.value = failureMessage(e, "No hemos podido comprobar ese código. Inténtalo de nuevo.");
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

const resentMessage = ref('');
const resendFailure = ref('');

async function resend() {
  isResendingOtp.value = true;
  resentMessage.value = '';
  resendFailure.value = '';
  customerUtils.getLoginOtp(otpData.country.id, otpData.number).then(() => {
    resentMessage.value = "We've sent a new code by SMS. It can take a minute to arrive.";
  }).catch(async (e) => {
    logRequestFailure(e, 'otp-sign-in');
    resendFailure.value = failureMessage(e, "No hemos podido enviar un código nuevo. Inténtalo de nuevo.");
  }).finally(() => {
    isResendingOtp.value = false;
  });

  await startResendOtpTimer();
}

onMounted(async () => {
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
        <a href="javascript:" class="mx-auto"><BrandLogo class="mb-5 mx-auto" /></a>
      </div>
      <!-- Form Header -->
      <h2 class="text-2xl font-semibold text-black mb-4 text-center mt-14 sm:mt-8">Secure Login</h2>
      <p class="text-md text-[#B7A3C1] mb-2 text-center">Enter the verification code sent to <span class="font-bold">+{{ otpData.country.callingCode }}{{ otpData.number }}</span></p>
      <p class="text-sm/6 text-[#B7A3C1] mb-8 text-center lg:px-12">The code may take a few seconds to arrive.</p>
      <!-- Form -->
      <form @submit.prevent="authenticate" class="space-y-10">
        <div v-if="otpError" class="rounded-2xl border border-danger-100 bg-danger-50 px-4 py-3">
          <p class="text-sm/6 text-danger-700">{{ otpError }}</p>
        </div>
        <v-otp-input
            class="flex flex-row items-center justify-between w-full max-w-md space-x-3 mx-auto"
            input-classes="w-12 h-12 lg:w-16 lg:h-16 flex flex-col items-center justify-center text-center px-3 lg:px-5 border border-gray-300 rounded-2xl text-lg otp-input transition-all focus:border-brand-700 focus:ring-4 focus:ring-brand-700/10"
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
        <div class="mt-6 max-w-md flex justify-between mx-auto">
          <button
            :disabled="isLoading"
            type="submit"
            class="group relative block w-full overflow-hidden rounded-xl bg-brand-700 py-3.5 text-center text-sm/6 font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-800 hover:shadow-md active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
          >
            <template v-if="isVerifying">
              <span class="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                <Spinner :class="'size-4'" />
                Un momento...
              </span>
            </template>
            <template v-else>
              <span class="inline-flex items-center justify-center gap-2">
                Login
                <i class="pi pi-arrow-right text-sm/6 transition-transform duration-200 group-hover:translate-x-0.5"></i>
              </span>
            </template>
          </button>
        </div>
        <template v-if="! isLoading && ! isVerifying">
          <p v-if="resentMessage" role="status" class="mb-3 rounded-lg bg-success-50 px-3 py-2 text-center text-sm/6 text-success-700">{{ resentMessage }}</p>
          <p v-if="resendFailure" role="alert" class="mb-3 rounded-lg bg-danger-50 px-3 py-2 text-center text-sm/6 text-danger-700">{{ resendFailure }}</p>
          <div v-if="! isResendingOtp" class="text-sm/6 text-gray-500 text-center">
            Didn't receive OTP?
            <a
              v-if="showResendButton"
              @click="resend"
              class="ml-1 inline-flex cursor-pointer items-center rounded-full px-2 py-0.5 font-medium text-brand-700 transition-colors hover:bg-brand-50 hover:underline"
            >Resend code</a>
            <template v-else> Resend in {{ countdown }}s</template>
          </div>
          <div v-else class="text-sm/6 text-gray-500 text-center animate-pulse">Resending OTP ...</div>
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