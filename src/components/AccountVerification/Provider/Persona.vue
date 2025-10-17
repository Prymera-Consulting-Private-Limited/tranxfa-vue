<script setup>
import Persona from 'persona';
import {onMounted, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
import {useCustomerStore} from "@/stores/customer.js";

const customerUtils = useCustomerUtils();
const customerStore = useCustomerStore();

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

const emit = defineEmits(['sdkInitialized', 'sdkError', 'sdkStepCompleted', 'sdkApplicantStatusChanged', 'sdkCancelled']);

async function getNewAccessToken() {
  let accessToken = null;
  await customerUtils.getAccountVerificationToken(props.documentCategory, props.documentType).then((response) => {
    accessToken = response.data.token;
  }).catch((e) => {
    console.error(e);
    throw e;
  });

  return accessToken;
}

function init() {
  client.open();
  emit('sdkInitialized');
}

let client = null;
async function launchPersonaWebSdk() {
  const accessToken = await getNewAccessToken();
  client = new Persona.Client({
    inquiryId: accessToken,
    language: 'en-US',
    onReady: () => init(),
    onEvent: (eventName, metaData) => {
      console.log(`Event: ${eventName}`);
    },
    onComplete: () => {
      emit('sdkApplicantStatusChanged');
    },
    onCancel: () => {
      emit('sdkCancelled');
    },
    onError: (status, code) => {
      emit('sdkError');
    }
  });
}

onMounted(async () => {
  // const accessToken = await getNewAccessToken();
  await launchPersonaWebSdk();
})
</script>
<template>
</template>