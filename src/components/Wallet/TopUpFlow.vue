<script setup>
import {onUnmounted, ref, watch} from "vue";
import {Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot} from "@headlessui/vue";
import {ClipboardIcon, ExclamationTriangleIcon} from "@heroicons/vue/24/outline/index.js";
import {UseClipboard} from "@vueuse/components";
import moment from "moment";
import ModalCloseButton from "@/components/ModalCloseButton.vue";
import Spinner from "@/components/Spinner.vue";
import ClientPaymentAccount from "@/components/ClientPaymentAccount.vue";
import AwaitingPending from "@/components/Payment/State/AwaitingPending.vue";
import ClientPaymentAccountModel from "@/models/client_payment_account.js";
import WalletTopup from "@/models/wallet_topup.js";
import WalletRefusalType from "@/enums/wallet_refusal_type.js";
import {useWalletUtils} from "@/composables/wallet_utils.js";

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  topup: {
    type: Object(WalletTopup),
    required: false,
    default: null,
  },
});

const emit = defineEmits([
  'close',
  'declared',
]);

const walletUtils = useWalletUtils();

const step = ref('declare');
const amount = ref('');
const amountErrors = ref([]);
const collisionMessage = ref('');
const generalError = ref('');
const isSubmitting = ref(false);

const declaration = ref(null);
const account = ref(null);
const isProvisioning = ref(false);

let retryTimeoutId = null;

function clearRetryTimeout() {
  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }
}

watch(() => props.open, (open) => {
  clearRetryTimeout();
  if (! open) return;
  amount.value = '';
  amountErrors.value = [];
  collisionMessage.value = '';
  generalError.value = '';
  account.value = null;
  isProvisioning.value = false;
  if (props.topup) {
    declaration.value = props.topup;
    step.value = 'instructions';
    fetchInstructions();
  } else {
    declaration.value = null;
    step.value = 'declare';
  }
});

onUnmounted(() => {
  clearRetryTimeout();
});

async function fetchInstructions() {
  clearRetryTimeout();
  await walletUtils.getDepositInstructions().then((response) => {
    if (response.status === 202) {
      isProvisioning.value = true;
      retryTimeoutId = setTimeout(fetchInstructions, 5000);
    } else {
      isProvisioning.value = false;
      const instance = ClientPaymentAccountModel.getInstance(response.data);
      if (! instance.paymentReference) {
        instance.paymentReference = declaration.value?.reference;
      }
      account.value = instance;
    }
  }).catch((e) => {
    generalError.value = e.response?.data?.message ?? 'We were unable to load your deposit details. Please try again.';
  });
}

async function declare() {
  if (isSubmitting.value) return;
  amountErrors.value = [];
  collisionMessage.value = '';
  generalError.value = '';
  isSubmitting.value = true;
  await walletUtils.declareTopup(amount.value).then((response) => {
    declaration.value = WalletTopup.getInstance(response.data);
    emit('declared');
    step.value = 'instructions';
    fetchInstructions();
  }).catch((e) => {
    if (e.response?.data?.type === WalletRefusalType.TOPUP_AMOUNT_COLLIDES) {
      collisionMessage.value = e.response.data.message;
    } else if (e.response?.status === 422) {
      amountErrors.value = e.response.data.errors?.amount ?? [e.response.data.message];
    } else {
      generalError.value = e.response?.data?.message ?? 'Something went wrong. Please try again.';
    }
  }).finally(() => {
    isSubmitting.value = false;
  });
}

function close() {
  if (isSubmitting.value) return;
  clearRetryTimeout();
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

              <template v-if="step === 'declare'">
                <DialogTitle as="h3" class="text-base font-semibold text-gray-900 pr-8">Add money to your wallet</DialogTitle>
                <p class="mt-1 text-sm text-gray-500">Declare the amount first, then transfer exactly that amount from your bank. The match is made on the amount, so it has to be spot on.</p>

                <div v-if="generalError" class="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{{ generalError }}</div>

                <div v-if="collisionMessage" class="mt-4 border-l-4 border-yellow-400 bg-yellow-50 p-4">
                  <div class="flex">
                    <div class="shrink-0">
                      <ExclamationTriangleIcon class="size-5 text-yellow-400" aria-hidden="true" />
                    </div>
                    <div class="ml-3">
                      <p class="text-sm text-yellow-700">{{ collisionMessage }}</p>
                    </div>
                  </div>
                </div>

                <form @submit.prevent="declare" class="mt-4">
                  <label for="topup-amount" :class="[amountErrors.length > 0 ? 'text-red-600' : 'text-gray-900']" class="block text-sm/6 font-semibold">Amount <span class="text-red-500">*</span></label>
                  <input v-model="amount" id="topup-amount" type="text" inputmode="decimal" placeholder="0.00" class="mt-2 block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm text-base text-gray-900 focus:outline-none" />
                  <template v-for="(message, i) in amountErrors" :key="`amount-error-${i}`">
                    <p class="mt-2 text-sm text-red-600">{{ message }}</p>
                  </template>
                  <button type="submit" :disabled="isSubmitting || ! amount" class="mt-5 block w-full rounded-md bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
                    <span v-if="isSubmitting" class="flex justify-center items-center">
                      <Spinner :class="'w-4 h-4 mr-2'" />
                      <span>Saving ...</span>
                    </span>
                    <span v-else>Continue</span>
                  </button>
                </form>
              </template>

              <template v-else-if="isProvisioning">
                <div class="text-center">
                  <AwaitingPending class="-mt-6" />
                  <h3 class="text-lg font-semibold text-gray-900 -mt-8">Getting your account ready</h3>
                  <p class="mt-2 mb-4 text-sm text-gray-500">We're opening your personal deposit account. This usually takes a moment — your transfer details will appear automatically.</p>
                </div>
              </template>

              <template v-else-if="step === 'instructions'">
                <DialogTitle as="h3" class="text-base font-semibold text-gray-900 pr-8">Make your bank transfer</DialogTitle>
                <p v-if="account?.instruction" class="mt-1 text-sm text-gray-600 leading-6">{{ account.instruction }}</p>

                <div v-if="generalError" class="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{{ generalError }}</div>

                <div class="mt-4 border-l-4 border-yellow-400 bg-yellow-50 p-4">
                  <div class="flex">
                    <div class="shrink-0">
                      <ExclamationTriangleIcon class="size-5 text-yellow-400" aria-hidden="true" />
                    </div>
                    <div class="ml-3">
                      <p class="text-sm text-yellow-700">Transfer exactly <strong>{{ declaration?.amountFormatted }}</strong> — this is how we match your deposit to your wallet. A different amount will not be credited automatically.</p>
                    </div>
                  </div>
                </div>

                <div class="text-left my-4">
                  <label for="topup-declared-amount" class="block text-sm/6 font-medium text-gray-900">Transfer Amount</label>
                  <UseClipboard v-slot="{ copy, copied }" :source="declaration?.amount">
                    <div class="mt-2 flex">
                      <div class="-mr-px grid grow grid-cols-1 focus-within:relative">
                        <input type="text" readonly :value="declaration?.amountFormatted" id="topup-declared-amount" class="col-start-1 row-start-1 block w-full rounded-l-md bg-gray-50 py-2.5 px-3 text-base font-semibold text-gray-900 outline-1 -outline-offset-1 outline-gray-300 sm:text-sm/6" />
                      </div>
                      <button @click="copy()" type="button" class="flex shrink-0 items-center gap-x-1.5 rounded-r-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900 outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-50 cursor-pointer">
                        <ClipboardIcon class="-ml-0.5 size-4 text-gray-400" aria-hidden="true" />
                      </button>
                    </div>
                    <p v-if="copied" class="text-green-600 mt-2 font-normal text-xs">Transfer Amount has been copied!</p>
                  </UseClipboard>
                </div>

                <template v-if="account">
                  <ClientPaymentAccount v-bind:account="account" />
                </template>

                <p v-if="declaration?.expiresAt" class="mt-4 text-xs text-gray-500">This declaration expires {{ moment(declaration.expiresAt).fromNow() }} ({{ moment(declaration.expiresAt).format('MMMM D, YYYY h:mm A') }}). A declaration that expires moves no money.</p>

                <button type="button" @click="close" class="mt-5 block w-full rounded-md bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-brand-600 cursor-pointer">Done</button>
              </template>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
