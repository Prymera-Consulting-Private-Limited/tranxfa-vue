<script setup>
import {Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot} from '@headlessui/vue';
import Spinner from "@/components/Spinner.vue";

defineProps({
  open: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <TransitionRoot as="template" :show="open">
    <!-- No @close handler and no buttons — this call is already in flight, so -->
    <!-- there is nothing safe to cancel back out to; the poll is what closes it. -->
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
        <div class="fixed inset-0 bg-gray-500/90 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
              as="template"
              enter="ease-out duration-300"
              enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100"
              leave="ease-in duration-200"
              leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="relative w-full max-w-sm transform overflow-hidden rounded-2xl bg-white px-6 py-8 text-center shadow-xl transition-all">
              <Spinner class="mx-auto size-10" />
              <DialogTitle class="mt-4 text-base font-semibold text-gray-900">Confirming your booking</DialogTitle>
              <p class="mt-2 text-sm text-gray-500">This can take a moment while we finalise everything with the hotel. Please don't close or refresh this page.</p>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
