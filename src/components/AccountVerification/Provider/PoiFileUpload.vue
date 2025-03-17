<script setup>
import AwsRekognitionLivenessCheck from "@/components/AccountVerification/AwsRekognitionLivenessCheck.vue";
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
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
</script>

<template>
<AwsRekognitionLivenessCheck
    v-bind:documentCategory="documentCategory"
    v-bind:documentType="documentType"
    v-on:sdkInitialized="sdkInitialized"
    v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
/>
</template>