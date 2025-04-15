<script setup>
import { computed, ref } from 'vue';
import { useCustomerUtils } from '@/composables/customer_utils';
import { ComputerDesktopIcon, DevicePhoneMobileIcon, GlobeAltIcon } from '@heroicons/vue/24/outline';
import { Dialog, DialogPanel, DialogTitle, DialogDescription, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline';
import Device from "@/models/device.js";
import { useTimeUtils } from "@/composables/time_utils";
import router from "@/router/index.js";

const props = defineProps({
  device: {
    type: Object(Device),
    required: true
  }
});

const customerUtils = useCustomerUtils();

const timeUtils = useTimeUtils();

const deviceIcon = computed(() => {
  if (props.device.deviceType === 'browser') {
    return GlobeAltIcon;
  } else if (props.device.deviceType === 'mobile') {
    return DevicePhoneMobileIcon;
  }
  return ComputerDesktopIcon;
});

const deviceName = computed(() => {
  if (props.device.model) {
    return props.device.model;
  }
  return props.device.clientName;
});

const emit = defineEmits(['deviceDeleted']);

const isConfirmDeleteModalOpen = ref(false);
const isDeleting = ref(false);
const isDeleted = ref(false);

const handleDelete = async () => {
  isConfirmDeleteModalOpen.value = false;
  try {
    isDeleting.value = true;
    await customerUtils.deleteDevice(props.device.id);
    isDeleted.value = true;
    setTimeout(() => {
      emit('deviceDeleted', props.device);
      isConfirmDeleteModalOpen.value = false;
    }, 300); // Wait for fade-out animation to complete
  } catch (error) {
    console.error('Failed to delete device:', error);
    isDeleting.value = false;
  }
};
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    leave-active-class="transition-opacity duration-300"
    enter-from-class="opacity-100"
    enter-to-class="opacity-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="!isDeleted" class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all duration-200" :class="{ 'animate-pulse': isDeleting }">
      <div class="flex flex-col items-start justify-between">
        <div class="flex items-center space-x-4">
          <div class="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
            <component :is="deviceIcon" class="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h3 class="text-base/6 font-medium text-gray-900">{{ deviceName }}</h3>
            <p class="text-sm/6 font-medium text-gray-500">{{ device.osName }}</p>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between mt-4">
        <div v-if="device.isCurrent" class="inline-flex items-center text-sm font-medium text-green-700">
          This Device
        </div>
        <button 
          v-if="!device.isCurrent" 
          @click="isConfirmDeleteModalOpen = true" 
          class="text-sm text-red-600 hover:text-red-700 font-medium hover:underline cursor-pointer"
          :disabled="isDeleting"
        >
          {{ isDeleting ? 'Deleting...' : 'Sign Out' }}
        </button>
      </div>

      <p class="text-xs mt-0.5">Last used {{ timeUtils.getNiceTime(device.touchedAt) }}</p>

      <TransitionRoot as="template" :show="isConfirmDeleteModalOpen">
        <Dialog as="div" class="relative z-10" @close="isConfirmDeleteModalOpen = false">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
            <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
          </TransitionChild>

          <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  <div class="sm:flex sm:items-start">
                    <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <ExclamationTriangleIcon class="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <DialogTitle as="h3" class="text-base font-semibold leading-6 text-gray-900">Sign out from device</DialogTitle>
                      <div class="mt-2">
                        <DialogDescription class="text-sm text-gray-500">
                          Are you sure you want to sign out from this device? This will immediately log you out from this device and you'll need to sign in again to access your account.
                        </DialogDescription>
                      </div>
                    </div>
                  </div>
                  <div class="mt-5 sm:mt-4 sm:flex sm:flex-row">
                    <button
                      type="button"
                      class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:mr-3 sm:w-auto cursor-pointer"
                      @click="handleDelete"
                      :disabled="isDeleting"
                    >
                      {{ isDeleting ? 'Deleting...' : 'Sign Out' }}
                    </button>
                    <button
                      type="button"
                      class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer"
                      @click="isConfirmDeleteModalOpen = false"
                      :disabled="isDeleting"
                    >
                      Cancel
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </TransitionRoot>
    </div>
  </Transition>
</template> 