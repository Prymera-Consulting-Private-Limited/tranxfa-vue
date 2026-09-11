<script setup>
import {MAX_UPLOAD_MB} from "@/composables/upload_rules.js";
import {failureMessage, logRequestFailure} from "@/composables/api_utils.js";
import InlineFailure from "@/components/InlineFailure.vue";
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
import {computed, onMounted, ref} from "vue";
import SingleFileUpload from "@/components/AccountVerification/SingleFileUpload.vue";
import Spinner from "@/components/Spinner.vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";

const props = defineProps({
  documentCategory: {
    type: DocumentCategory,
    required: true,
  },
  documentType: {
    type: DocumentType,
    required: true,
  }
})

const customerUtils = useCustomerUtils();

const files = ref([]);

const emit = defineEmits([
  'sdkInitialized',
  'sdkError',
  'sdkStepCompleted',
  'sdkApplicantStatusChanged'
]);

const sdkInitialized = () => {
  emit('sdkInitialized');
}

const sdkFinalStateReached = () => {
  emit('sdkApplicantStatusChanged');
}

onMounted(() => {
  sdkInitialized();
})

const photoSideSelected = (file) => {
  files.value[0] = file;
}

const backSideSelected = (file) => {
  files.value[1] = file;
}

const isSaving = ref(false);
const saveFailure = ref(null);
// The documented optional upload fields the type can ask for.
const documentNumber = ref('');
const expiryDate = ref('');

async function save() {
  isSaving.value = true;
  saveFailure.value = null;
  customerUtils.uploadDocument(props.documentCategory, props.documentType, files.value.map((file) => file.path), {document_number: documentNumber.value, expiry_date: expiryDate.value}).then((response) => {
    emit('sdkApplicantStatusChanged', response.data);
  }).catch((e) => {
    logRequestFailure(e, 'upload-document');
    saveFailure.value = failureMessage(e, "We couldn't attach these photos to your account. They are still here, so please try again.");
  }).finally(() => {
    isSaving.value = false;
  });
}

const canSave = computed(() => {
  if (files.value.length === 0) {
    return false;
  }
  const incompleteFiles = files.value.filter((file) => file.status !== 'completed');
  if (incompleteFiles.length > 0) {
    return false;
  }
  return !isSaving.value;
})

</script>

<template>

  <div class="px-6 py-8 space-y-6">
    <div>
      <h1 class="text-lg font-bold">Upload {{ documentType.title }}</h1>
      <p class="text-sm/6 text-gray-600">Take a photo of the whole document with no glare, so every detail is readable. JPEG, PNG or WebP, up to {{ MAX_UPLOAD_MB }} MB each. "Front" is the side with your photo.</p>
    </div>
    <div class="grid sm:grid-cols-2 items-center justify-center gap-5">
      <SingleFileUpload
          v-bind:page="'photo'"
          v-bind:documentCategory="documentCategory"
          v-bind:documentType="documentType"
          v-on:fileSelected="photoSideSelected"
      />
      <SingleFileUpload
          v-bind:page="'back'"
          v-bind:documentCategory="documentCategory"
          v-bind:documentType="documentType"
          v-on:fileSelected="backSideSelected"
      />
    </div>
    <form @submit.prevent="save">
      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div v-if="documentType.documentNumberLabel">
          <label :for="`document-number-${documentType.id}`" class="block text-sm/6 font-medium text-gray-900">{{ documentType.documentNumberLabel }}</label>
          <input :id="`document-number-${documentType.id}`" v-model.trim="documentNumber" type="text" autocomplete="off" class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm/6 focus:outline-2 focus:-outline-offset-2 focus:outline-brand-600" />
        </div>
        <div>
          <label :for="`expiry-date-${documentType.id}`" class="block text-sm/6 font-medium text-gray-900">Expiry date <span class="font-normal text-gray-500">(if the document has one)</span></label>
          <input :id="`expiry-date-${documentType.id}`" v-model="expiryDate" type="date" class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm/6 focus:outline-2 focus:-outline-offset-2 focus:outline-brand-600" />
        </div>
      </div>
      <button :disabled="!canSave" type="submit" class="mt-6 block w-full bg-brand-700 text-white text-center py-3.5 rounded-xl font-medium transition cursor-pointer hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand-700">
        <template v-if="isSaving">
          <span class="flex items-center justify-center whitespace-nowrap">
            <Spinner class="size-4 mr-2" />
            Uploading ...
          </span>
        </template>
        <template v-else>Upload</template>
      </button>
      <InlineFailure :message="saveFailure" />
    </form>
  </div>
</template>

<style scoped>
input[type="file"] {
  display: none;
}
</style>