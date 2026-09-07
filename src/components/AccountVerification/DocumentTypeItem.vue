<script setup>
import {ExclamationTriangleIcon, IdentificationIcon} from "@heroicons/vue/24/outline";
import DocumentType from "@/models/document_type.js";
import {ref} from "vue";
import System from "@/components/AccountVerification/Provider/System.vue";
import {Dialog, DialogPanel, TransitionChild, TransitionRoot} from "@headlessui/vue";
import Sumsub from "@/components/AccountVerification/Provider/Sumsub.vue";
import Spinner from "@/components/Spinner.vue";
import DocumentCategory from "@/models/document_category.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import UpPass from "@/components/AccountVerification/Provider/UpPass.vue";
import Persona from "@/components/AccountVerification/Provider/Persona.vue";
import Shufti from "@/components/AccountVerification/Provider/Shufti.vue";
import Didit from "@/components/AccountVerification/Provider/Didit.vue";
import {getCustomerMessage} from "@/composables/api_utils.js";

const customerUtils = useCustomerUtils();

// Provider codes the backend sends as `api` that are all served by the Sumsub
// web SDK. SUMSUB-VIA-FINCODE is Sumsub reached through Fincode: same SDK, same
// token endpoint, so it renders the same component.
const SUMSUB_APIS = ['SUMSUB', 'SUMSUB-VIA-FINCODE'];

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
const sdkErrorMessage = ref('')

async function openAccountVerificationModal () {
  sdkErrorMessage.value = '';
  openSdk.value = true;
}

/**
 * Every provider emits sdkError, and until now nothing listened. A vendor that
 * failed - or, far more often, a token endpoint that answered 500 - left the
 * spinner turning with no message and no way out but the backdrop, which is
 * the "the button does nothing" report.
 *
 * The message comes from getCustomerMessage so a refusal the API wrote for a
 * customer ("this document type is not available") is shown as-is; a vendor
 * SDK error object carries no such message and falls back to our own wording.
 */
function sdkFailed(error) {
  sdkErrorMessage.value = getCustomerMessage(error)
      || 'We could not start your verification. Please try again.';
  isSdkInitialized.value = false;
}

// Clearing the message re-enters the v-if chain, so the provider is mounted
// afresh and asks for a new token. That is the whole retry.
function retrySdk() {
  isSdkInitialized.value = false;
  sdkErrorMessage.value = '';
}

const emit = defineEmits([
  'sdkFinalStateReached',
])

async function sdkFinalStateReached () {
  await emit('sdkFinalStateReached');
  await closeSdk();
}

async function closeSdk() {
  openSdk.value = false;
  isSdkInitialized.value = false;
  sdkErrorMessage.value = '';
}

</script>

<template>
  <div class="flex flex-1 flex-col p-8">
    <IdentificationIcon class="mx-auto size-16 shrink-0 rounded-full text-brand-700" />
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
    <Dialog class="relative z-10" @close="closeSdk">
      <TransitionChild as="div" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
      </TransitionChild>
      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild as="div" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all min-w-sm sm:my-8 sm:w-full lg:min-w-md sm:max-w-sm lg:max-w-md lg:w-md">
              <button class="sr-only"></button>
              <div v-if="sdkErrorMessage" role="alert" class="p-10 text-center">
                <ExclamationTriangleIcon class="mx-auto size-12 text-red-500" />
                <h3 class="mt-4 text-sm font-medium text-gray-900">Verification could not start</h3>
                <p class="mt-2 text-sm text-gray-500">{{ sdkErrorMessage }}</p>
                <div class="mt-6 flex justify-center gap-3">
                  <button v-on:click="retrySdk" type="button" class="rounded-[10px] bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition cursor-pointer">Try again</button>
                  <button v-on:click="closeSdk" type="button" class="rounded-[10px] border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer">Close</button>
                </div>
              </div>
              <template v-else>
                <div v-show="! isSdkInitialized" role="status" class="p-10">
                  <Spinner class="size-16 mx-auto" />
                  <span class="sr-only">Loading...</span>
                </div>
                <Sumsub
                    v-if="SUMSUB_APIS.includes(documentType.api)"
                    v-on:sdkInitialized="isSdkInitialized = true"
                    v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
                    v-on:sdkError="sdkFailed"
                    v-bind:documentType="documentType"
                    v-bind:documentCategory="documentCategory"
                />
                <UpPass
                  v-if="documentType.api === 'UPPASS'"
                  v-on:sdkInitialized="isSdkInitialized = true"
                  v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
                  v-on:sdkError="sdkFailed"
                  v-bind:documentType="documentType"
                  v-bind:documentCategory="documentCategory"
                />
                <Persona
                    v-if="documentType.api === 'CYBRID'"
                    v-on:sdkInitialized="isSdkInitialized = true"
                    v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
                    v-on:sdkError="sdkFailed"
                    v-on:sdkCancelled="closeSdk"
                    v-bind:documentType="documentType"
                    v-bind:documentCategory="documentCategory"
                />
                <Shufti
                    v-if="documentType.api === 'SHUFTI'"
                    v-on:sdkInitialized="isSdkInitialized = true"
                    v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
                    v-on:sdkError="sdkFailed"
                    v-bind:documentType="documentType"
                    v-bind:documentCategory="documentCategory"
                />
                <Didit
                    v-if="documentType.api === 'DIDIT'"
                    v-on:sdkInitialized="isSdkInitialized = true"
                    v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
                    v-on:sdkError="sdkFailed"
                    v-on:sdkCancelled="closeSdk"
                    v-bind:documentType="documentType"
                    v-bind:documentCategory="documentCategory"
                />
                <System
                    v-if="documentType.api === 'SYSTEM'"
                    v-on:sdkInitialized="isSdkInitialized = true"
                    v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
                    v-on:sdkError="sdkFailed"
                    v-bind:documentType="documentType"
                    v-bind:documentCategory="documentCategory"
                />
              </template>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>