<script setup>
import Persona from 'persona';
import {onMounted, onUnmounted, ref} from "vue";
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

// getNewAccessToken() rethrows, and this used to let that reject unhandled -
// so the most likely failure of all, a token endpoint answering 500, emitted
// nothing and left the parent's spinner turning forever. It still rethrows,
// because Sumsub also uses it as the SDK's token-refresh callback where
// throwing is the contract; the catch belongs here instead.
onMounted(async () => {
  try {
    await launchPersonaWebSdk();
  } catch (e) {
    emit('sdkError', e);
  }
})

onUnmounted(() => {
  // Persona's client owns a modal it appends to the document, outside this
  // component's tree, so unmounting the component does not remove it. Without
  // this the overlay outlives the dialog and the next mount opens a second one
  // behind the first.
  client?.destroy?.();
  client = null;
})
</script>
<template>
</template>