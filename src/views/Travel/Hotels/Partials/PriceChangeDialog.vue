<script setup>
import {Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot} from '@headlessui/vue';
import {ExclamationTriangleIcon} from '@heroicons/vue/24/outline';

defineProps({
  open: {
    type: Boolean,
    default: false,
  },

  currency: {
    type: String,
    default: null,
  },

  amount: {
    type: String,
    default: null,
  },

  isBooking: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['confirm', 'cancel']);
</script>

<template>
  <TransitionRoot as="template" :show="open">
    <!-- No @close handler on purpose: ETG requires an explicit choice on a price -->
    <!-- change, so escape/backdrop must not be a silent way to accept it. -->
    <Dialog class="relative z-50" @close="() => {}">
      <TransitionChild
          as="template"
          enter="ease-out duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="ease-in duration-200"
          leave-from="opacity-100"
          leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild
              as="template"
              enter="ease-out duration-300"
              enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enter-to="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leave-from="opacity-100 translate-y-0 sm:scale-100"
              leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel class="relative w-full transform overflow-hidden rounded-2xl bg-white px-5 pb-6 pt-5 text-left shadow-xl transition-all sm:my-8 sm:max-w-sm sm:p-6">
              <div class="flex size-11 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <ExclamationTriangleIcon class="size-6" aria-hidden="true" />
              </div>
              <DialogTitle class="mt-3 text-lg font-semibold text-gray-900">The price has changed</DialogTitle>
              <p class="mt-1 text-sm text-gray-600">
                Our travel partner confirmed availability at a different rate than you were shown. Confirm the new total to book at this price, or cancel.
              </p>
              <p class="mt-4 flex items-baseline justify-center gap-1.5 rounded-xl bg-gray-50 py-3">
                <span class="text-sm font-medium text-gray-500">{{ currency }}</span>
                <span class="text-2xl font-semibold tracking-tight text-gray-900 tabular-nums">{{ amount }}</span>
              </p>
              <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                    type="button"
                    :disabled="isBooking"
                    class="inline-flex cursor-pointer justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    @click="$emit('cancel')"
                >Cancel booking</button>
                <button
                    type="button"
                    :disabled="isBooking"
                    class="inline-flex cursor-pointer justify-center rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 focus-visible:outline-0 disabled:cursor-not-allowed disabled:opacity-60"
                    @click="$emit('confirm')"
                >{{ isBooking ? 'Booking…' : 'Confirm & book at this price' }}</button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
