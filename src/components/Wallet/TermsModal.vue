<script setup>
import {ref, watch} from "vue";
import {Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot} from "@headlessui/vue";
import {CheckCircleIcon, ClipboardIcon} from "@heroicons/vue/24/outline/index.js";
import {UseClipboard} from "@vueuse/components";
import {notify} from "notiwind";
import ModalCloseButton from "@/components/ModalCloseButton.vue";
import Spinner from "@/components/Spinner.vue";
import WalletTerms from "@/models/wallet_terms.js";
import WalletRefusalType from "@/enums/wallet_refusal_type.js";
import {useWalletStore} from "@/stores/wallet.js";
import {useWalletUtils} from "@/composables/wallet_utils.js";

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  mode: {
    type: String,
    required: false,
    default: 'enrol',
  },
});

const emit = defineEmits([
  'close',
  'accepted',
]);

const walletStore = useWalletStore();
const walletUtils = useWalletUtils();

const isLoadingTerms = ref(false);
const terms = ref(null);
const accepted = ref(false);
const isSubmitting = ref(false);
const generalError = ref('');
const enrolled = ref(false);

watch(() => props.open, (open) => {
  if (open) {
    terms.value = null;
    accepted.value = false;
    generalError.value = '';
    enrolled.value = false;
    fetchTerms();
  }
});

async function fetchTerms() {
  isLoadingTerms.value = true;
  await walletUtils.getTerms().then((response) => {
    terms.value = WalletTerms.getInstance(response.data);
  }).catch((e) => {
    generalError.value = e.response?.data?.message ?? 'We were unable to load the wallet terms. Please try again.';
  }).finally(() => {
    isLoadingTerms.value = false;
  });
}

async function accept() {
  if (! accepted.value || ! terms.value || isSubmitting.value) return;
  generalError.value = '';
  isSubmitting.value = true;
  await walletUtils.acceptTerms(terms.value.id).then(() => {
    emit('accepted');
    if (props.mode === 'reaccept') {
      notify(
          {
            group: 'customer',
            title: 'Wallet Restored',
            text: 'Thanks — the updated terms are accepted and your wallet is back in action.',
            type: 'success',
          },
          -1,
      );
      emit('close');
    } else {
      enrolled.value = true;
    }
  }).catch((e) => {
    if (e.response?.status === 412) {
      if (e.response.data.type === WalletRefusalType.TERMS_OUTDATED) {
        generalError.value = e.response.data.message;
        accepted.value = false;
        fetchTerms();
      } else if (e.response.data.type === WalletRefusalType.ALREADY_SUBSCRIBED) {
        emit('accepted');
        emit('close');
      } else {
        generalError.value = e.response.data.message;
      }
    } else if (e.response?.status === 422) {
      generalError.value = e.response.data.message;
    } else {
      generalError.value = 'Something went wrong. Please try again.';
    }
  }).finally(() => {
    isSubmitting.value = false;
  });
}

function close() {
  if (isSubmitting.value) return;
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

              <template v-if="enrolled">
                <div class="text-center py-4">
                  <CheckCircleIcon class="mx-auto size-12 text-green-500" aria-hidden="true" />
                  <DialogTitle as="h3" class="mt-3 text-lg font-semibold text-gray-900">Your wallet is active</DialogTitle>
                  <p class="mt-2 text-sm text-gray-500">Here is your wallet number — you'll see it on your wallet screen and statements.</p>
                  <div class="mt-4 max-w-xs mx-auto text-left">
                    <UseClipboard v-slot="{ copy, copied }" :source="walletStore.subscription.data?.walletNumber">
                      <div class="flex">
                        <div class="-mr-px grid grow grid-cols-1 focus-within:relative">
                          <input type="text" readonly :value="walletStore.subscription.data?.walletNumber" id="wallet-number" class="col-start-1 row-start-1 block w-full rounded-l-md bg-gray-50 py-2.5 px-3 text-base font-semibold tracking-widest text-gray-900 outline-1 -outline-offset-1 outline-gray-300 sm:text-sm/6" />
                        </div>
                        <button @click="copy()" type="button" class="flex shrink-0 items-center gap-x-1.5 rounded-r-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900 outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-50 cursor-pointer">
                          <ClipboardIcon class="-ml-0.5 size-4 text-gray-400" aria-hidden="true" />
                        </button>
                      </div>
                      <p v-if="copied" class="text-green-600 mt-2 font-normal text-xs">Wallet number has been copied!</p>
                    </UseClipboard>
                  </div>
                  <button type="button" @click="emit('close')" class="mt-6 inline-flex justify-center rounded-md bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-brand-600 cursor-pointer">Done</button>
                </div>
              </template>

              <template v-else>
                <DialogTitle as="h3" class="text-base font-semibold text-gray-900 pr-8">
                  {{ mode === 'reaccept' ? 'Updated wallet terms' : 'Wallet terms' }}
                </DialogTitle>
                <p v-if="mode === 'reaccept'" class="mt-2 rounded-md bg-brand-50 px-4 py-3 text-sm text-brand-800">We've updated the wallet terms. Review and accept the new version to keep using your wallet — your balance is safe either way.</p>
                <p v-else class="mt-1 text-sm text-gray-500">Please read and accept the terms to activate your wallet.</p>

                <div v-if="generalError" class="mt-4 border-l-4 border-yellow-400 bg-yellow-50 p-4">
                  <p class="text-sm text-yellow-700">{{ generalError }}</p>
                </div>

                <div v-if="isLoadingTerms" class="mt-4 space-y-2 animate-pulse">
                  <div class="h-3 rounded bg-gray-200"></div>
                  <div class="h-3 rounded bg-gray-200"></div>
                  <div class="h-3 w-2/3 rounded bg-gray-200"></div>
                </div>
                <template v-else-if="terms">
                  <div class="mt-4 max-h-64 overflow-y-auto whitespace-pre-line rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">{{ terms.content }}</div>
                  <p class="mt-2 text-xs text-gray-400">Version {{ terms.version }}</p>
                  <div class="mt-4 flex items-start space-x-2">
                    <input type="checkbox" id="wallet-terms-accepted" v-model="accepted" class="mt-1 w-4 h-4 min-w-4 min-h-4 text-brand-700 border-gray-300 rounded focus:ring-brand-700 focus:ring-0 outline-none accent-brand-700" />
                    <label for="wallet-terms-accepted" class="text-sm/6 text-gray-700">I have read and accept the wallet terms.</label>
                  </div>
                  <button type="button" @click="accept" :disabled="! accepted || isSubmitting" class="mt-5 block w-full rounded-md bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
                    <span v-if="isSubmitting" class="flex justify-center items-center">
                      <Spinner :class="'w-4 h-4 mr-2'" />
                      <span>Saving ...</span>
                    </span>
                    <span v-else>{{ mode === 'reaccept' ? 'Accept and continue' : 'Accept and activate' }}</span>
                  </button>
                </template>
              </template>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
