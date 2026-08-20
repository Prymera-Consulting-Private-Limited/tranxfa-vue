<script setup>
import {onMounted, onUnmounted} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
import { DiditSdk } from '@didit-protocol/sdk-web';
import router from "@/router/index.js";

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

const emit = defineEmits(['sdkInitialized', 'sdkError', 'sdkStepCompleted', 'sdkApplicantStatusChanged', 'sdkCancelled']);

DiditSdk.shared.onEvent = (event) => {
  if (event.type === 'didit:ready') {
    emit('sdkInitialized');
  }
};

DiditSdk.shared.onComplete = (result) => {
  switch (result.type) {
    // didit:completed is the terminal event of the hosted flow; the parent only
    // refreshes the customer and redirects on sdkApplicantStatusChanged.
    case 'completed':
      emit('sdkApplicantStatusChanged', result);
      break;
    case 'cancelled':
      emit('sdkCancelled');
      break;
    case 'failed':
      emit('sdkError', result.error);
      break;
  }
};

async function getNewAccessToken() {
  let accessToken = null;
  const route = router.currentRoute.value;
  const fullUrl = window.location.origin + route.fullPath;
  await customerUtils.getAccountVerificationToken(props.documentCategory, props.documentType, null, fullUrl).then((response) => {
    accessToken = response.data.token;
  }).catch((e) => {
    console.error(e);
    throw e;
  });

  return accessToken;
}

async function launchSdk(accessToken) {
  await DiditSdk.shared.startVerification({
    url: 'https://verify.didit.me/session/' + accessToken,
    configuration: {
      // Otherwise the Didit overlay stays open over the app after completion,
      // and dismissing it reports the session as cancelled.
      closeModalOnComplete: true,
    },
  });
}

onMounted(async () => {
  const accessToken = await getNewAccessToken();
  await launchSdk(accessToken);
})

onUnmounted(() => {
  // DiditSdk.shared is a singleton, so drop this instance's callbacks and any
  // leftover overlay rather than letting a stale closure fire after unmount.
  DiditSdk.shared.onComplete = undefined;
  DiditSdk.shared.onEvent = undefined;
  DiditSdk.shared.destroy();
})
</script>