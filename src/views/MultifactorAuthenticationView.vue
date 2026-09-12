<script setup>
import {failureMessage, logRequestFailure} from "@/composables/api_utils.js";
import BrandLogo from "@/components/BrandLogo.vue";
import {onMounted, ref} from "vue";
import VOtpInput from "vue3-otp-input";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCustomerStore} from "@/stores/customer.js";
import Spinner from "@/components/Spinner.vue";
import router from "@/router/index.js";
import {safeRedirect} from "@/router/guards.js";
import {useResendCountdown} from "@/composables/resend_countdown.js";

// The redirect sign-in was carrying, if it is still a path on this site.
const onward = () => {
  const redirect = safeRedirect(router.currentRoute.value.query.redirect);
  return redirect ? {redirect} : {};
};

const otp = ref('');
const isLoading = ref(false);
// Sent here by the 412 interceptor rather than by sign-in: the API has not
// sent a code for this step yet, so one is requested on arrival.
const isSessionReverify = router.currentRoute.value.query.reason === 'session';
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
    router.push({name: 'onboardingWorkflow', query: onward()});
  }).catch((e) => {
    if (e.response?.status === 422) {
      otpError.value = e.response.data.message;
    } else if (e.response?.status === 403) {
      customerUtils.refresh();
      router.push({name: 'onboardingWorkflow', query: onward()});
    } else {
      logRequestFailure(e, 'mfa');
      otpError.value = failureMessage(e, "We couldn't check that code. Please try again.");
    }
  }).finally(() => {
    isLoading.value = false;
    isVerifying.value = false;
  });
}

const {countdown, showResendButton, start: startResendOtpTimer} = useResendCountdown();

const resentMessage = ref('');
const resendFailure = ref('');

async function resend() {
  isResendingOtp.value = true;
  resentMessage.value = '';
  resendFailure.value = '';
  customerUtils.resendMfaOtp().then(() => {
    resentMessage.value = "We've sent a new code. It can take a minute to arrive.";
  }).catch(async (e) => {
    if (e.response?.status === 403) {
      await customerUtils.refresh();
      return;
    }
    logRequestFailure(e, 'resend-mfa-code');
    resendFailure.value = failureMessage(e, "We couldn't send a new code. Please try again.");
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
  if (isSessionReverify) {
    customerUtils.resendMfaOtp().catch((e) => {
      logRequestFailure(e, 'mfa-reverify-code');
      resendFailure.value = failureMessage(e, "We couldn't send a new code. Use Resend code below.");
    });
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
        <a href="javascript:" class="mx-auto"><BrandLogo class="mb-5 mx-auto" /></a>
      </div>
      <!-- Form Header -->
      <h2 class="text-2xl font-semibold text-black mb-4 text-center mt-14 sm:mt-8">{{ $t('onboarding.mfaHeading') }}</h2>
      <p v-if="isSessionReverify" class="text-md text-[#B7A3C1] mb-2 text-center">{{ $t('onboarding.mfaIntro', {email: customer.data?.account?.email}) }}</p>
      <p v-else class="text-md text-[#B7A3C1] mb-2 text-center">{{ $t('onboarding.enterEmailCode', {email: customer.data?.account?.email}) }}</p>
      <p class="text-sm/6 text-[#B7A3C1] mb-8 text-center lg:px-12">{{ $t('verification.emailCodeDelay') }}</p>
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
                <Spinner :class="'size-4'" />{{ $t('recipient.pleaseWait') }}</span>
            </template>
            <template v-else>
              <span class="inline-flex items-center justify-center gap-2">{{ $t('onboarding.login') }}<i class="pi pi-arrow-right text-sm/6 transition-transform duration-200 group-hover:translate-x-0.5"></i>
              </span>
            </template>
          </button>
        </div>
        <template v-if="! isLoading && ! isVerifying">
          <p v-if="resentMessage" role="status" class="mb-3 rounded-lg bg-success-50 px-3 py-2 text-center text-sm/6 text-success-700">{{ resentMessage }}</p>
          <p v-if="resendFailure" role="alert" class="mb-3 rounded-lg bg-danger-50 px-3 py-2 text-center text-sm/6 text-danger-700">{{ resendFailure }}</p>
          <div v-if="! isResendingOtp" class="text-sm/6 text-gray-500 text-center">{{ $t('onboarding.didntReceiveOtp') }} <a
              v-if="showResendButton"
              @click="resend"
              class="ml-1 inline-flex cursor-pointer items-center rounded-full px-2 py-0.5 font-medium text-brand-700 transition-colors hover:bg-brand-50 hover:underline"
            >{{ $t('verification.resendCode') }}</a>
            <template v-else>{{ $t('verification.resendInCountdownS', {countdown: countdown}) }}</template>
          </div>
          <div v-else class="text-sm/6 text-gray-500 text-center animate-pulse">{{ $t('onboarding.resendingEmailCode', {email: customer.data?.account?.email}) }}</div>
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