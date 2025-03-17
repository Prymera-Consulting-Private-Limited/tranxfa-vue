<script setup>
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
import MultiFileUpload from "@/components/AccountVerification/MultiFileUpload.vue";
import PoiFileUpload from "@/components/AccountVerification/Provider/PoiFileUpload.vue";

const emit = defineEmits([
  'sdkInitialized',
  'sdkError',
  'sdkStepCompleted',
  'sdkApplicantStatusChanged'
]);

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

const sdkInitialized = () => {
  emit('sdkInitialized');
}

const sdkFinalStateReached = () => {
  emit('sdkApplicantStatusChanged');
}
</script>

<template>
  <PoiFileUpload
      v-if="documentCategory.code === 'POI'"
      v-bind:documentCategory="documentCategory"
      v-bind:documentType="documentType"
      v-on:sdkInitialized="sdkInitialized"
      v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
    />
  <MultiFileUpload
      v-else
      v-bind:documentCategory="documentCategory"
      v-bind:documentType="documentType"
      v-on:sdkInitialized="sdkInitialized"
      v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
    />
</template>