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
  <!-- The Dialog swallows @close on purpose: ETG requires an explicit choice on
  a price change, so escape/backdrop must not be a silent way to accept it. Kept
  out here because Vue keeps template comments as vnodes in dev, and a comment
  inside TransitionRoot/TransitionChild breaks their single-child ref passthrough. -->
  <TransitionRoot as="template" :show="open">
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
        <div class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" />
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
            <DialogPanel class="relative w-full transform overflow-hidden rounded-3xl bg-white text-center shadow-2xl transition-all sm:my-8 sm:max-w-md">
              <!-- A soft amber wash behind the icon, so the "heads up" tone reads
              before a single word does without shouting error-red. -->
              <div class="bg-gradient-to-b from-amber-50 to-white px-6 pt-8">
                <div class="relative mx-auto size-14">
                  <span class="absolute inset-0 animate-ping rounded-full bg-amber-200/60 [animation-duration:2.5s]" aria-hidden="true" />
                  <span class="relative flex size-14 items-center justify-center rounded-full bg-white text-amber-500 shadow-sm ring-1 ring-amber-200">
                    <ExclamationTriangleIcon class="size-7" aria-hidden="true" />
                  </span>
                </div>
                <DialogTitle class="mt-5 text-xl font-semibold tracking-tight text-gray-900">The price has changed</DialogTitle>
                <p class="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-gray-500">
                  Our travel partner confirmed availability at a different rate than you were shown.
                </p>
              </div>
              <div class="px-6 pt-6">
                <div class="rounded-2xl bg-gray-50 px-5 py-4 ring-1 ring-inset ring-gray-100">
                  <p class="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">New total price</p>
                  <p class="mt-1 flex items-baseline justify-center gap-1.5">
                    <span class="text-sm font-medium text-gray-500">{{ currency }}</span>
                    <span class="text-4xl font-semibold tracking-tight text-gray-900 tabular-nums">{{ amount }}</span>
                  </p>
                </div>
                <p class="mt-3 text-xs text-gray-400">Continuing books at this price. Cancelling releases the room, so you can pick another.</p>
              </div>
              <div class="flex flex-col gap-2.5 px-6 pb-6 pt-5">
                <button
                    type="button"
                    :disabled="isBooking"
                    class="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 focus-visible:outline-0 disabled:cursor-not-allowed disabled:opacity-60"
                    @click="$emit('confirm')"
                >
                  <svg v-if="isBooking" class="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  {{ isBooking ? 'Booking…' : 'Book at this price' }}
                </button>
                <button
                    type="button"
                    :disabled="isBooking"
                    class="inline-flex w-full cursor-pointer items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-0 disabled:cursor-not-allowed disabled:opacity-60"
                    @click="$emit('cancel')"
                >Cancel booking</button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
