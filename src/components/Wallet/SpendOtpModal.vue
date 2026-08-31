<script setup>
import {onUnmounted, ref, watch} from "vue";
import {Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot} from "@headlessui/vue";
import VOtpInput from "vue3-otp-input";
import pTimeout from 'p-timeout';
import ModalCloseButton from "@/components/ModalCloseButton.vue";
import Spinner from "@/components/Spinner.vue";
import {useWalletUtils} from "@/composables/wallet_utils.js";

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  quoteId: {
    type: String,
    required: false,
    default: null,
  },
  error: {
    type: String,
    required: false,
    default: '',
  },
  isSubmitting: {
    type: Boolean,
    required: false,
    default: false,
  },
});

const emit = defineEmits([
  'close',
  'complete',
]);

const walletUtils = useWalletUtils();

const otp = ref('');
const otpInput = ref(null);
const isResending = ref(false);
const resendError = ref('');

const showResendButton = ref(false);
const countdown = ref(30);

let countdownIntervalId = null;

function clearCountdownInterval() {
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
}

async function startResendOtpTimer() {
  clearCountdownInterval();
  showResendButton.value = false;
  countdown.value = 30;

  try {
    const timer = new Promise((resolve) => {
      countdownIntervalId = setInterval(() => {
        countdown.value -= 1;
        if (countdown.value === 0) {
          clearCountdownInterval();
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

watch(() => props.open, (open) => {
  if (open) {
    otp.value = '';
    resendError.value = '';
    startResendOtpTimer();
  } else {
    clearCountdownInterval();
  }
});

watch(() => props.error, (error) => {
  if (error) {
    otp.value = '';
    otpInput.value?.clearInput();
  }
});

onUnmounted(() => {
  clearCountdownInterval();
});

function submit() {
  if (props.isSubmitting || otp.value.length !== 6) return;
  emit('complete', otp.value);
}

async function resend() {
  if (! props.quoteId) return;
  isResending.value = true;
  resendError.value = '';
  otp.value = '';
  otpInput.value?.clearInput();
  walletUtils.requestSpendOtp(props.quoteId).catch((e) => {
    resendError.value = e.response?.data?.message ?? 'We could not send a new code. Please try again.';
  }).finally(() => {
    isResending.value = false;
  });

  await startResendOtpTimer();
}

function close() {
  if (props.isSubmitting) return;
  emit('close');
}
</script>

<template>
  <TransitionRoot as="template" :show="open">
    <Dialog class="relative z-50" @close="close">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
      </TransitionChild>
      <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative w-full transform overflow-hidden rounded-2xl bg-white p-4 text-left shadow-xl transition-all sm:my-8 sm:max-w-lg sm:p-6">
              <ModalCloseButton @close="close" />
              <DialogTitle as="h3" class="text-base font-semibold text-gray-900 pr-8">Confirm your wallet payment</DialogTitle>
              <p class="mt-1 text-sm text-gray-500">We've emailed you a 6-digit code for this payment. It's valid for 10 minutes. It may take a minute to arrive — check your spam folder too.</p>

              <form @submit.prevent="submit" class="mt-5">
                <div v-if="error" class="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                  <p class="text-sm text-red-700">{{ error }}</p>
                </div>
                <div v-if="resendError" class="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                  <p class="text-sm text-red-700">{{ resendError }}</p>
                </div>
                <v-otp-input
                    ref="otpInput"
                    class="flex flex-row items-center justify-center w-full max-w-md space-x-3 mx-auto"
                    input-classes="w-12 h-12 flex flex-col items-center justify-center text-center px-3 border border-gray-300 rounded-2xl text-lg otp-input transition-all focus:border-brand-700 focus:ring-4 focus:ring-brand-700/10"
                    separator=""
                    inputType="number"
                    inputmode="numeric"
                    :num-inputs="6"
                    v-model:value="otp"
                    :should-auto-focus="true"
                    :should-focus-order="true"
                    :placeholder="['*', '*', '*', '*', '*', '*']"
                    @on-complete="submit"
                />
                <button type="submit" :disabled="isSubmitting || otp.length !== 6" class="mt-5 block w-full rounded-md bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
                  <span v-if="isSubmitting" class="flex justify-center items-center">
                    <Spinner :class="'w-4 h-4 mr-2'" />
                    <span>Confirming ...</span>
                  </span>
                  <span v-else>Confirm payment</span>
                </button>
                <template v-if="! isSubmitting">
                  <div v-if="! isResending" class="mt-4 text-sm text-gray-500 text-center">
                    Didn't receive the code?
                    <a v-if="showResendButton" @click="resend" class="ml-1 inline-flex cursor-pointer items-center rounded-full px-2 py-0.5 font-medium text-brand-700 transition-colors hover:bg-brand-50 hover:underline">Resend code</a>
                    <template v-else> Resend in {{ countdown }}s</template>
                  </div>
                  <div v-else class="mt-4 text-sm text-gray-500 text-center animate-pulse">Sending a new code to your email ...</div>
                </template>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
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
