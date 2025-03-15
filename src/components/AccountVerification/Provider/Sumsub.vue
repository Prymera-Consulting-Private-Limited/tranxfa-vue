<script setup>
import snsWebSdk from '@sumsub/websdk';
import {onMounted, ref} from "vue";
import router from "@/router/index.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";

const customerUtils = useCustomerUtils();

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

const emit = defineEmits(['sdkInitialized', 'sdkError', 'sdkStepCompleted', 'sdkApplicantStatusChanged']);

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

/**
 * @param accessToken - access token that you generated on the backend
 */
async function launchSumsubWebSdk(accessToken) {
  let snsWebSdkInstance = snsWebSdk
      .init(
          accessToken,
           () => getNewAccessToken()
      )
      .withConf({
        lang: "en",
        theme: "dark" | "light",
      })
      .withOptions({ addViewportTag: false, adaptIframeHeight: true })
      // see below what kind of messages WebSDK generates
      .on("idCheck.onStepCompleted", (payload) => {
        emit('sdkStepCompleted', payload);
      })
      .on("idCheck.onError", (error) => {
        emit('sdkError', error);
      })
      .on("idCheck.onInitialized", () => {
        isSumsubInitialized.value = true;
        emit('sdkInitialized');
      })
      .on("idCheck.onApplicantStatusChanged", (payload) => {
        emit('sdkApplicantStatusChanged', payload);
      })
      .build();

  snsWebSdkInstance.launch("#sumsub-container");
}

const isSumsubInitialized = ref(false);

onMounted(async () => {
  const accessToken = await getNewAccessToken();
  await launchSumsubWebSdk(accessToken);
})
</script>
<template>
  <div v-show="isSumsubInitialized" id="sumsub-container"></div>
</template>