<script setup>
import {IdentificationIcon} from "@heroicons/vue/24/outline";
import DocumentType from "@/models/document_type.js";
import {ref} from "vue";
import System from "@/components/AccountVerification/Provider/System.vue";
import {Dialog, DialogPanel, TransitionChild, TransitionRoot} from "@headlessui/vue";
import Sumsub from "@/components/AccountVerification/Provider/Sumsub.vue";
import Spinner from "@/components/Spinner.vue";
import DocumentCategory from "@/models/document_category.js";

const props = defineProps({
  documentCategory: {
    type: Object(DocumentCategory),
    required: true
  },
  documentType: {
    type: Object(DocumentType),
    required: true
  }
})

const openSdk = ref(false)
const isSdkInitialized = ref(false)

async function openAccountVerificationModal () {
  openSdk.value = true;
}

const emit = defineEmits([
  'sdkFinalStateReached',
])

async function sdkFinalStateReached () {
  await customerUtils.refresh();
  openSdk.value = false;
  emit('sdkFinalStateReached');
}

</script>

<template>
  <div class="flex flex-1 flex-col p-8">
    <IdentificationIcon class="mx-auto size-16 shrink-0 rounded-full text-purple-700" />
    <h3 class="mt-6 text-sm font-medium text-gray-900">{{ documentType.title }}</h3>
    <dl v-if="documentType.description" class="mt-1 flex grow flex-col justify-between">
      <dt class="sr-only">Information</dt>
      <dd class="mt-3 text-sm text-gray-500">
        <p>{{ documentType.description }}</p>
      </dd>
      <dt class="sr-only">Start Verification</dt>
      <dd class="mt-3 text-sm text-gray-500">
        <a @click="openAccountVerificationModal(documentType)" href="javascript:" class="text-brand-700 font-semibold hover:underline">Start Verification</a>
      </dd>
    </dl>
  </div>
  <TransitionRoot as="div" :show="openSdk">
    <Dialog class="relative z-10" @close="openSdk = false">
      <TransitionChild as="div" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
      </TransitionChild>
      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild as="div" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:w-sm sm:max-w-sm lg:max-w-md lg:w-md">
              <div v-show="! isSdkInitialized" role="status" class="p-10">
                <Spinner class="size-16 mx-auto" />
                <span class="sr-only">Loading...</span>
              </div>
              <Sumsub
                  v-if="documentType.api === 'SUMSUB'"
                  v-on:sdkInitialized="isSdkInitialized = true"
                  v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
                  v-bind:documentType="documentType"
                  v-bind:documentCategory="documentCategory"
              />
              <System
                  v-if="documentType.api === 'SYSTEM'"
                  v-on:sdkInitialized="isSdkInitialized = true"
                  v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
                  v-bind:documentType="documentType"
                  v-bind:documentCategory="documentCategory"
              />
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>