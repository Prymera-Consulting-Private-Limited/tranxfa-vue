<script setup>
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
import {onMounted, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCustomerStore} from "@/stores/customer.js";

const customerUtils = useCustomerUtils();
const customerStore = useCustomerStore();

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

const accessToken = ref('');

onMounted(async () => {
  accessToken.value = await getNewAccessToken();
  sdkInitialized();
})
</script>

<template>
  <iframe class="min-h-160" width="100%" v-if="accessToken" :src="accessToken"></iframe>
</template>