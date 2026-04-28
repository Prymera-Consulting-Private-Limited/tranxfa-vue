<script setup>
import { computed, onMounted, ref } from "vue";
import VOtpInput from "vue3-otp-input";
import pTimeout from 'p-timeout';
import { useCustomerUtils } from "@/composables/customer_utils.js";
import { useCustomerStore } from "@/stores/customer.js";
import { useOtpAuthContextStore } from "@/stores/otp_auth_context.js";
import Spinner from "@/components/Spinner.vue";
import router from "@/router/index.js";

const otp = ref('');
const isLoading = ref(false);
const isVerifying = ref(false);
const isResendingOtp = ref(false);
const otpError = ref('');
const customerUtils = useCustomerUtils();
const customerStore = useCustomerStore();
const otpContext = useOtpAuthContextStore();

const maskedMobile = computed(() => {
  const raw = otpContext.mobile_number || '';
  if (raw.length < 4) return 'your mobile number';
  const maskLen = Math.min(Math.max(raw.length - 4, 0), 10);
  return `${'•'.repeat(maskLen)}${raw.slice(-4)}`;
});

/**
 * @param {'login' | 'signup' | null} flow captured before otpContext.clear()
 */
function postAuthRoute(flow) {
  if (flow === 'signup') {
    return { name: 'onboardingWorkflow' };
  }
  // Returning user after login + mobile OTP
  if (customerStore.customer.data?.account?.isEmailVerified && customerStore.customer.data?.session?.mfaMethod !== null) {
    return { name: 'multiFactorAuth' };
  }
  return { name: 'dashboard' };
}

async function authenticate() {
  if (!otpContext.isReady()) {
    await router.replace({ name: 'signIn' });
    return;
  }
  isLoading.value = true;
  isVerifying.value = true;
  otpError.value = '';
  await customerUtils.loginWithMobileOtp(
    otpContext.country,
    otpContext.mobile_number,
    otp.value,
  ).then(() => {
    const flow = otpContext.flow;
    otpContext.clear();
    router.push(postAuthRoute(flow));
  }).catch((e) => {
    const status = e.response?.status;
    if (status === 422) {
      otpError.value = e.response?.data?.message
        || (e.response?.data?.errors && Object.values(e.response.data.errors).flat().join(' '))
        || 'Invalid code. Please try again.';
    } else if (status === 429) {
      otpError.value = 'Too many attempts. Please wait and try again.';
    } else if (status === 401) {
      otpError.value = e.response?.data?.message || 'Unauthorized. Please start again.';
    } else if (status === 403) {
      const flow = otpContext.flow;
      customerUtils.refresh();
      otpContext.clear();
      router.push(postAuthRoute(flow));
    } else {
      console.error(e);
      otpError.value = e.response?.data?.message || 'Something went wrong. Please try again.';
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
  if (!otpContext.isReady()) {
    await router.replace({ name: 'signIn' });
    return;
  }
  isResendingOtp.value = true;
  otpError.value = '';
  const req = otpContext.flow === 'signup'
    ? customerUtils.resendMobileVerification(otpContext.country, otpContext.mobile_number)
    : customerUtils.resendLoginOtp(otpContext.country, otpContext.mobile_number);

  req.catch(async (e) => {
    const status = e.response?.status;
    if (status === 429) {
      otpError.value = 'Too many requests. Please wait before resending.';
    } else if (status === 422) {
      otpError.value = e.response?.data?.message || 'Could not resend code.';
    } else if (status === 401) {
      otpError.value = e.response?.data?.message || 'Unauthorized.';
    } else {
      console.error(e);
    }
  }).finally(() => {
    isResendingOtp.value = false;
  });

  await startResendOtpTimer();
}

onMounted(async () => {
  if (!otpContext.isReady()) {
    await router.replace({ name: 'signIn' });
    return;
  }
  await startResendOtpTimer();
});

const appUrl = import.meta.env.VITE_APP_URL;

function clearOtpAndLeave() {
  otpContext.clear();
}
</script>
<template>
  <main>
    <div class="relative flex items-center justify-center min-h-screen bg-gray-50 tracking-wider">
      <div class="relative flex flex-col md:flex-row w-full min-h-screen md:h-screen bg-white">
        <div class=" w-[60%] md:w-[60%] h-auto md:h-full">
          <img src="/images/backgrounds/otp.png" alt="Login Background" class="w-full h-90 md:h-full object-cover hidden md:block">
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

        <div class="flex-1 flex items-center justify-center p-4 md:p-8 pt-[100px] sm:pt-0 md:pt-8 relative min-h-0">
          <div v-if="isLoading && !isVerifying"
            class="absolute inset-0 flex items-center justify-center bg-white/75 z-10">
            <i class="pi pi-spin pi-spinner text-5xl text-brand-700"></i>
          </div>
          <div v-show="!isLoading || isVerifying" class="w-full max-w-xl">
            <div class="hidden md:block">
              <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-h-16 mb-5 -ml-2"></a>
            </div>
            <h2 class="text-2xl font-semibold text-black mb-4 text-center mt-6 sm:mt-2 md:text-left md:mt-0">Verify your
              mobile</h2>
            <p class="text-md text-[#B7A3C1] mb-2 text-center md:text-left">Enter the one time password we sent to {{
              maskedMobile }}</p>
            <p class="text-sm text-[#B7A3C1] mb-8 text-center md:text-left lg:pe-0 lg:ps-0">It may take up to a minute
              to arrive. Check your Junk or Spam folder if you do not see it.</p>
            <form @submit.prevent="authenticate" class="space-y-10">
              <div v-if="otpError" class="rounded-md bg-red-50 p-4">
                <div class="flex">
                  <div class="">
                    <div class="text-sm text-red-700">
                      {{ otpError }}
                    </div>
                  </div>
                </div>
              </div>
              <v-otp-input class="flex flex-row items-center justify-between w-full  space-x-3 mx-auto"
                input-classes="w-12 h-12 lg:w-16 lg:h-16 flex flex-col items-center justify-center text-center px-3 lg:px-5 border-b border border-gray-300 rounded-lg text-lg otp-input"
                separator="" inputType="number" inputmode="numeric" :num-inputs="6" v-model:value="otp"
                :should-auto-focus="true" :should-focus-order="true" :placeholder="['*', '*', '*', '*', '*', '*']"
                @on-complete="authenticate" />
              <div class="mt-6  flex justify-between mx-auto">
                <button :disabled="isLoading" :class="[{ 'opacity-70': isLoading }]" type="submit"
                  class="block w-full bg-brand-700 text-white text-center py-3  rounded-[10px] font-medium hover:bg-brand-800 transition cursor-pointer">
                  <template v-if="isVerifying">
                    <span class="flex items-center justify-center whitespace-nowrap">
                      <Spinner :class="'size-4 mr-2'" />
                      Please wait...
                    </span>
                  </template>
                  <template v-else>Continue</template>
                </button>
              </div>
              <template v-if="!isLoading && !isVerifying">
                <div v-if="!isResendingOtp" class="text-sm text-gray-500 text-center">Didn't receive OTP? <a
                    @click="resend" class="text-brand-700 hover:text-brand-700 hover:underline cursor-pointer"
                    v-if="showResendButton">Resend code</a> <template v-else>Resend in {{ countdown }}s</template>
                </div>
                <div v-else class="text-sm text-gray-500 text-center animate-pulse">Resending one time password to {{
                  maskedMobile }}
                  ...</div>
              </template>
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
