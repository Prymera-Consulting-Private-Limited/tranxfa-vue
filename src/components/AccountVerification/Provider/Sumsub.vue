<script setup>
import snsWebSdk from '@sumsub/websdk';
import {onMounted, onUnmounted, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
import {useCustomerStore} from "@/stores/customer.js";
import ReviewAnswer from "@/enums/review_answer.js";

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

const emit = defineEmits(['sdkInitialized', 'sdkError', 'sdkStepCompleted', 'sdkApplicantStatusChanged', 'sdkApplicantRejected']);

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
// Module scope so onUnmounted can tear it down. The SDK mounts an iframe into
// #sumsub-container and holds listeners of its own; leaving those alive after
// the modal closes is how a later mount ends up with two.
let snsWebSdkInstance = null;

async function launchSumsubWebSdk(accessToken) {
  snsWebSdkInstance = snsWebSdk
      .init(
          accessToken,
           () => getNewAccessToken()
      )
      .withConf({
        lang: "es",
        theme: "dark" | "light",
        country: customerStore.customer.data?.country?.iso3Alpha,
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
      // Only a completed review is terminal; anything else is the applicant
      // still moving through the flow and must not be reported as an outcome.
      //
      // RED used to fall through here and emit nothing at all, so a rejected
      // customer saw exactly what a hung SDK looks like: the modal sitting
      // there, no message and nothing to do. It is a real answer and it gets
      // its own event, because the call sites cannot treat it as success - the
      // transfer wizard waits for the document to leave pendingDocuments, and
      // a rejected one never does.
      .on("idCheck.onApplicantStatusChanged", (payload) => {
        if (payload.reviewStatus !== 'completed') {
          return;
        }

        if (payload?.reviewResult?.reviewAnswer === ReviewAnswer.GREEN) {
          emit('sdkApplicantStatusChanged', payload);

          return;
        }

        emit('sdkApplicantRejected', payload);
      })
      .build();

  snsWebSdkInstance.launch("#sumsub-container");
}

const isSumsubInitialized = ref(false);

// getNewAccessToken() rethrows, and this used to let that reject unhandled -
// so the most likely failure of all, a token endpoint answering 500, emitted
// nothing and left the parent's spinner turning forever. It still rethrows,
// because Sumsub also uses it as the SDK's token-refresh callback where
// throwing is the contract; the catch belongs here instead.
onMounted(async () => {
  try {
    const accessToken = await getNewAccessToken();
    await launchSumsubWebSdk(accessToken);
  } catch (e) {
    emit('sdkError', e);
  }
})

onUnmounted(() => {
  // Guarded rather than called outright: the instance does not exist if the
  // token request failed before the SDK was ever built, and destroy() is not
  // promised by the builder's type.
  snsWebSdkInstance?.destroy?.();
  snsWebSdkInstance = null;
})
</script>
<template>
  <div v-show="isSumsubInitialized" id="sumsub-container"></div>
</template>