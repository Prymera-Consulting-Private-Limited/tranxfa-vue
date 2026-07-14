<script setup>
import {onMounted} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
import {useCustomerStore} from "@/stores/customer.js";
import { DiditSdk } from '@didit-protocol/sdk-web';
import router from "@/router/index.js";

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

const emit = defineEmits(['sdkInitialized', 'sdkError', 'sdkStepCompleted', 'sdkApplicantStatusChanged']);

DiditSdk.shared.onComplete = (result) => {
  switch (result.type) {
    case 'completed':
      emit('sdkStepCompleted');
      break;
    case 'cancelled':
      emit('sdkError');
      break;
    case 'failed':
      emit('sdkError');
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
    url: 'https://verify.didit.me/session/' + accessToken
  });
}

onMounted(async () => {
  const accessToken = await getNewAccessToken();
  await launchSdk(accessToken);
})
</script>