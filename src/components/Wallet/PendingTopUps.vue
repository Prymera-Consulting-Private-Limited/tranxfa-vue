<script setup>
import {onMounted, onUnmounted, ref} from "vue";
import {Dialog, DialogDescription, DialogPanel, DialogTitle, TransitionChild, TransitionRoot} from "@headlessui/vue";
import {ExclamationTriangleIcon} from "@heroicons/vue/24/outline/index.js";
import {notify} from "notiwind";
import moment from "moment";
import WalletRefusalType from "@/enums/wallet_refusal_type.js";
import {useWalletUtils} from "@/composables/wallet_utils.js";

defineProps({
  topups: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits([
  'view',
  'cancelled',
]);

const walletUtils = useWalletUtils();

const topupToCancel = ref(null);
const isCancelling = ref(false);
const cancelError = ref('');

const tick = ref(0);
let intervalId = null;

onMounted(() => {
  intervalId = setInterval(() => {
    tick.value++;
  }, 30000);
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
});

function expiresIn(topup) {
  void tick.value;
  return moment(topup.expiresAt).fromNow();
}

function openCancelModal(topup) {
  cancelError.value = '';
  topupToCancel.value = topup;
}

async function cancelTopup() {
  if (! topupToCancel.value || isCancelling.value) return;
  isCancelling.value = true;
  cancelError.value = '';
  await walletUtils.cancelTopup(topupToCancel.value.id).then(() => {
    notify(
        {
          group: 'customer',
          title: 'Top-up Cancelled',
          text: 'The declaration has been withdrawn. No money has moved.',
          type: 'success',
        },
        -1,
    );
    topupToCancel.value = null;
    emit('cancelled');
  }).catch((e) => {
    if (e.response?.status === 412 && e.response.data.type === WalletRefusalType.TOPUP_NOT_OPEN) {
      topupToCancel.value = null;
      notify(
          {
            group: 'customer',
            title: 'Top-up Updated',
            text: e.response.data.message,
            type: 'info',
          },
          -1,
      );
      emit('cancelled');
    } else {
      cancelError.value = e.response?.data?.message ?? 'Something went wrong. Please try again.';
    }
  }).finally(() => {
    isCancelling.value = false;
  });
}
</script>

<template>
  <div class="rounded-lg bg-white border border-gray-100 px-4 py-4 sm:px-6">
    <h2 class="text-base font-semibold text-gray-900">Pending top-ups</h2>
    <p class="mt-0.5 text-sm text-gray-500">Waiting for your bank transfer to arrive — remember, the amount must match exactly.</p>
    <ul role="list" class="mt-2 divide-y divide-gray-100">
      <li v-for="topup in topups" :key="topup.id" class="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-gray-900">{{ topup.amountFormatted }} <span class="ml-2 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium tracking-wider text-gray-600">{{ topup.reference }}</span></p>
          <p class="mt-1 text-xs text-gray-500">Expires {{ expiresIn(topup) }} &middot; {{ moment(topup.expiresAt).format('MMM D, YYYY h:mm A') }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-x-4">
          <a href="javascript:" @click="emit('view', topup)" class="text-sm font-semibold text-brand-600 hover:text-brand-500">View details</a>
          <a href="javascript:" @click="openCancelModal(topup)" class="text-sm font-medium text-red-600 hover:text-red-500">Cancel</a>
        </div>
      </li>
    </ul>
  </div>

  <TransitionRoot as="template" :show="topupToCancel !== null">
    <Dialog as="div" class="relative z-50" @close="isCancelling ? null : topupToCancel = null">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
      </TransitionChild>
      <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <ExclamationTriangleIcon class="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <DialogTitle as="h3" class="text-base font-semibold leading-6 text-gray-900">Cancel this top-up</DialogTitle>
                  <div class="mt-2">
                    <DialogDescription class="text-sm text-gray-500">
                      This withdraws your declaration of {{ topupToCancel?.amountFormatted }}. If you've already made the bank transfer, don't cancel — the money is on its way and will be matched when it arrives.
                    </DialogDescription>
                  </div>
                  <p v-if="cancelError" class="mt-2 text-sm text-red-600">{{ cancelError }}</p>
                </div>
              </div>
              <div class="mt-5 sm:mt-4 sm:flex sm:flex-row">
                <button type="button" class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:mr-3 sm:w-auto cursor-pointer" @click="cancelTopup" :disabled="isCancelling">
                  {{ isCancelling ? 'Cancelling...' : 'Cancel top-up' }}
                </button>
                <button type="button" class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer" @click="topupToCancel = null" :disabled="isCancelling">
                  Keep it
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
