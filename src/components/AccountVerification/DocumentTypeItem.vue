<script setup>
import {useCustomerStore} from "@/stores/customer.js";
import KycDocumentStatus from "@/enums/kyc_document_status.js";
import {fixForError} from "@/composables/verification_routes.js";
import router from "@/router/index.js";
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
const customerStore = useCustomerStore();

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
const sdkRejected = ref(false)
const sdkRejectionReason = ref('')

async function openAccountVerificationModal () {
  sdkErrorMessage.value = '';
  sdkFix.value = null;
  sdkRejected.value = false;
  sdkRejectionReason.value = '';
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
  // The token endpoint answers 412 when the profile is missing something the
  // check needs (identity details, an address). That is not a retry.
  sdkFix.value = fixForError(error, router.currentRoute?.value?.fullPath ?? null);
  isSdkInitialized.value = false;
}

const sdkFix = ref(null);

function goToFix() {
  const fix = sdkFix.value;
  closeSdk();
  router.push(fix.route);
}

/**
 * A review that completed and came back refused.
 *
 * Distinct from sdkError on purpose. sdkError means the verification could not
 * be started - a vendor failure or a token endpoint that would not answer, and
 * trying again is reasonable. This means the vendor looked at the document and
 * said no, so the customer is told that plainly and the modal closes rather
 * than inviting them to press the same button again.
 *
 * The profile is refreshed because the document's status has changed; the
 * verification screen behind this reads it from the customer.
 */
async function sdkApplicantRejected(payload) {
  // Sumsub's payload names the reason; other providers decide by webhook and
  // the app hears about it as a CustomerDocumentRejected event with none.
  sdkRejectionReason.value = payload?.reviewResult?.moderationComment
      || payload?.reviewResult?.clientComment
      || payload?.reason
      || '';
  sdkRejected.value = true;
  isSdkInitialized.value = false;
  await customerUtils.refresh().catch(() => {});
}

// Clearing the message re-enters the v-if chain, so the provider is mounted
// afresh and asks for a new token. That is the whole retry.
function retrySdk() {
  isSdkInitialized.value = false;
  sdkErrorMessage.value = '';
  sdkFix.value = null;
  sdkRejected.value = false;
  sdkRejectionReason.value = '';
}

const emit = defineEmits([
  'sdkFinalStateReached',
])

async function sdkFinalStateReached () {
  // Didit, Persona, Shufti and UpPass finish their flow without a verdict;
  // the API decides by webhook. Read the refreshed profile before leaving:
  // a document of this type already marked rejected is shown here, with the
  // way forward, rather than closed over as if it had passed.
  await customerUtils.refresh().catch(() => {});
  const mine = (customerStore.customer.data?.documents ?? []).find((document) =>
      document.documentType?.id === props.documentType.id
      && (document.statusCode === KycDocumentStatus.REJECTED || document.statusCode === KycDocumentStatus.INVALIDATED));
  if (mine) {
    await sdkApplicantRejected({reason: ''});
    return;
  }
  await emit('sdkFinalStateReached');
  await closeSdk();
}

async function closeSdk() {
  openSdk.value = false;
  isSdkInitialized.value = false;
  sdkErrorMessage.value = '';
  sdkFix.value = null;
  sdkRejected.value = false;
  sdkRejectionReason.value = '';
}

</script>

<template>
  <div class="flex flex-1 flex-col p-8">
    <IdentificationIcon class="mx-auto size-16 shrink-0 rounded-full text-brand-700" />
    <h3 class="mt-6 text-sm/6 font-medium text-gray-900">{{ documentType.title }}</h3>
    <dl v-if="documentType.description" class="mt-1 flex grow flex-col justify-between">
      <dt class="sr-only">{{ $t('transfer.wizard.information') }}</dt>
      <dd class="mt-3 text-sm/6 text-gray-500">
        <p>{{ documentType.description }}</p>
      </dd>
      <dt class="sr-only">{{ $t('transfer.wizard.startVerification') }}</dt>
      <dd class="mt-3 text-sm/6 text-gray-500">
        <a @click="openAccountVerificationModal(documentType)" href="javascript:" class="text-brand-700 font-semibold hover:underline">{{ $t('transfer.wizard.startVerification') }}</a>
      </dd>
    </dl>
  </div>
  <TransitionRoot as="div" :show="openSdk">
    <Dialog class="relative z-50" @close="closeSdk">
      <TransitionChild as="div" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
      </TransitionChild>
      <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild as="div" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all min-w-sm sm:my-8 sm:w-full lg:min-w-md sm:max-w-sm lg:max-w-md lg:w-md">
              <button class="sr-only"></button>
              <div v-if="sdkRejected" role="alert" class="p-10 text-center">
                <ExclamationTriangleIcon class="mx-auto size-12 text-warning-500" />
                <h3 class="mt-4 text-sm/6 font-medium text-gray-900">{{ $t('verification.thisDocumentWasNotAccepted') }}</h3>
                <p class="mt-2 text-sm/6 text-gray-500">{{ sdkRejectionReason || $t('verification.theCheckDidNot') }}</p>
                <div class="mt-6 flex justify-center gap-3">
                  <button v-on:click="retrySdk" type="button" class="rounded-xl bg-brand-700 px-4 py-2.5 text-sm/6 font-medium text-white hover:bg-brand-800 transition cursor-pointer">{{ $t('verification.tryAnotherDocument') }}</button>
                  <button v-on:click="closeSdk" type="button" class="rounded-xl border border-gray-300 px-4 py-2 text-sm/6 font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer">{{ $t('verification.close') }}</button>
                </div>
              </div>
              <div v-else-if="sdkErrorMessage" role="alert" class="p-10 text-center">
                <ExclamationTriangleIcon class="mx-auto size-12 text-danger-500" />
                <h3 class="mt-4 text-sm/6 font-medium text-gray-900">{{ $t('verification.verificationCouldNotStart') }}</h3>
                <p class="mt-2 text-sm/6 text-gray-500">{{ sdkErrorMessage }}</p>
                <div class="mt-6 flex justify-center gap-3">
                  <button v-if="sdkFix" v-on:click="goToFix" type="button" class="rounded-xl bg-brand-700 px-4 py-2.5 text-sm/6 font-medium text-white hover:bg-brand-800 transition cursor-pointer">{{ sdkFix.label }}</button>
                  <button v-else v-on:click="retrySdk" type="button" class="rounded-xl bg-brand-700 px-4 py-2.5 text-sm/6 font-medium text-white hover:bg-brand-800 transition cursor-pointer">{{ $t('common.tryAgain') }}</button>
                  <button v-on:click="closeSdk" type="button" class="rounded-xl border border-gray-300 px-4 py-2 text-sm/6 font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer">{{ $t('verification.close') }}</button>
                </div>
              </div>
              <template v-else>
                <div v-show="! isSdkInitialized" role="status" class="p-10">
                  <Spinner class="size-16 mx-auto" />
                  <span class="sr-only">{{ $t('transfer.wizard.loading') }}</span>
                </div>
                <Sumsub
                    v-if="SUMSUB_APIS.includes(documentType.api)"
                    v-on:sdkInitialized="isSdkInitialized = true"
                    v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
                    v-on:sdkError="sdkFailed"
                    v-on:sdkApplicantRejected="sdkApplicantRejected"
                    v-bind:documentType="documentType"
                    v-bind:documentCategory="documentCategory"
                />
                <UpPass
                  v-if="documentType.api === 'UPPASS'"
                  v-on:sdkInitialized="isSdkInitialized = true"
                  v-on:sdkCancelled="closeSdk"
                  v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
                  v-on:sdkError="sdkFailed"
                  v-on:sdkApplicantRejected="sdkApplicantRejected"
                  v-bind:documentType="documentType"
                  v-bind:documentCategory="documentCategory"
                />
                <Persona
                    v-if="documentType.api === 'CYBRID'"
                    v-on:sdkInitialized="isSdkInitialized = true"
                    v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
                    v-on:sdkError="sdkFailed"
                    v-on:sdkApplicantRejected="sdkApplicantRejected"
                    v-on:sdkCancelled="closeSdk"
                    v-bind:documentType="documentType"
                    v-bind:documentCategory="documentCategory"
                />
                <Shufti
                    v-if="documentType.api === 'SHUFTI'"
                    v-on:sdkInitialized="isSdkInitialized = true"
                    v-on:sdkCancelled="closeSdk"
                    v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
                    v-on:sdkError="sdkFailed"
                    v-on:sdkApplicantRejected="sdkApplicantRejected"
                    v-bind:documentType="documentType"
                    v-bind:documentCategory="documentCategory"
                />
                <Didit
                    v-if="documentType.api === 'DIDIT'"
                    v-on:sdkInitialized="isSdkInitialized = true"
                    v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
                    v-on:sdkError="sdkFailed"
                    v-on:sdkApplicantRejected="sdkApplicantRejected"
                    v-on:sdkCancelled="closeSdk"
                    v-bind:documentType="documentType"
                    v-bind:documentCategory="documentCategory"
                />
                <System
                    v-if="documentType.api === 'SYSTEM'"
                    v-on:sdkInitialized="isSdkInitialized = true"
                    v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
                    v-on:sdkError="sdkFailed"
                    v-on:sdkApplicantRejected="sdkApplicantRejected"
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