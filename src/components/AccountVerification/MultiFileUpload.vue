<script setup>
import {failureMessage, logRequestFailure} from "@/composables/api_utils.js";
import InlineFailure from "@/components/InlineFailure.vue";
import {acceptFor, DOCUMENT_TYPES, MAX_UPLOAD_MB, validateUpload} from "@/composables/upload_rules.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
import {computed, onMounted, ref} from "vue";
import {ArrowPathIcon, ArrowUpTrayIcon, CheckCircleIcon, TrashIcon, XCircleIcon} from "@heroicons/vue/24/outline";
import Spinner from "@/components/Spinner.vue";
import {useAwsS3Utils} from "@/composables/aws_s3_utils.js";

const awsS3Utils = useAwsS3Utils();

const customerUtils = useCustomerUtils();

const accept = acceptFor(DOCUMENT_TYPES);

// The last reason a file was refused, shown under the drop zone instead of a
// browser alert.
const uploadError = ref(null);

const addFiles = (list) => {
  uploadError.value = null;
  Array.from(list).forEach((file) => {
    const problem = validateUpload(file);
    if (problem) {
      uploadError.value = `${file.name}: ${problem}`;
      return;
    }
    files.value.push({ file, name: file.name, size: file.size, status: 'pending', progress: 0 });
  });
};

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

const uploadToS3 = async (url, fileObject) => {
  fileObject.path = await awsS3Utils.uploadToPreSignedS3Url(url, fileObject.file, (progress) => {
    fileObject.progress = progress;
  });
}

onMounted(async () => {
  emit('sdkInitialized');
})

const files = ref([]);

const pendingFiles = computed(() => {
  return files.value.filter((file) => file.status === 'pending');
});

const handleFileSelect = (event) => {
  addFiles(event.target.files);
  uploadFiles();
};

const handleDrop = (event) => {
  event.preventDefault();
  isDragging.value = false
  addFiles(event.dataTransfer.files);
  uploadFiles();
};

// A red row with no words left the customer guessing whether to retry,
// pick a smaller file or wait. Each failure now carries a reason and the
// row can be retried on its own.
const uploadFile = async (fileObj) => {
  fileObj.status = 'preparing';
  fileObj.reason = null;
  let preSignedUrl;
  try {
    preSignedUrl = await getPreSignedUrl(fileObj.file);
  } catch (e) {
    fileObj.status = 'failed';
    fileObj.reason = failureMessage(e, "We couldn't prepare this file for upload.");
    return;
  }
  fileObj.status = 'uploading';
  try {
    await uploadToS3(preSignedUrl, fileObj);
    fileObj.path = objectKeyFrom(tokenResponses.get(preSignedUrl), preSignedUrl);
    fileObj.status = 'completed';
  } catch (e) {
    fileObj.status = 'failed';
    fileObj.reason = "The upload was interrupted. Check your connection and try again.";
  }
};

const uploadFiles = async () => {
  for (let fileObj of pendingFiles.value) {
    uploadFile(fileObj);
  }
};

// The object key used to be derived from the URL's path (everything after the
// first two segments), which depends on the bucket's URL shape rather than on
// the key layout. The API can send `object_key` beside `token`; when it does,
// that wins.
const objectKeyFrom = (response, url) => response.data.object_key ?? new URL(url).pathname.split('/').slice(2).join('/');

const tokenResponses = new Map();

const getPreSignedUrl = async (file) => {
  let accessToken = null;
  await customerUtils.getAccountVerificationToken(props.documentCategory, props.documentType, file).then((response) => {
    accessToken = response.data.token;
    tokenResponses.set(accessToken, response);
  }).catch((e) => {
    logRequestFailure(e, 'upload-token');
    throw e;
  });

  return accessToken;
};

const removeFile = (index) => {
  files.value.splice(index, 1);
};

const isUploading = computed(() => {
  return files.value.some((file) => (file.status === 'uploading' || file.status === 'pending' || file.status === 'preparing'));
});

const isSaving = ref(false);
const saveFailure = ref(null);
// The documented optional upload fields the type can ask for.
const documentNumber = ref('');
const expiryDate = ref('');

const isDragging = ref(false);

async function save() {
  isSaving.value = true;
  customerUtils.uploadDocument(props.documentCategory, props.documentType, files.value.map((file) => file.path), {document_number: documentNumber.value, expiry_date: expiryDate.value}).then((response) => {
    emit('sdkApplicantStatusChanged', response.data);
  }).catch((e) => {
    logRequestFailure(e, 'upload-document');
    saveFailure.value = failureMessage(e, "We couldn't attach these files to your account. Your files are still here, so please try again.");
  }).finally(() => {
    isSaving.value = false;
  });
}
</script>

<template>
  <div class="max-w-xl mx-auto p-6 bg-white">
    <h2 class="text-lg font-semibold text-gray-900 mb-2">Upload {{ documentType.title }}</h2>
    <i18n-t keypath="verification.uploadClearImages" tag="p" scope="global" class="text-sm/6 text-gray-500 mb-1"><template #document><span class="text-brand-700">{{ documentType.title }}</span></template></i18n-t>
    <p class="text-sm/6 text-gray-500 mb-4">{{ $t('verification.uploadFormats', {MAX_UPLOAD_MB: MAX_UPLOAD_MB}) }}</p>

    <div
        :class="{
      'border-brand-500 bg-brand-50': isDragging,
      'border-gray-300 bg-white': !isDragging,
    }"
        class="border-2 border-dashed p-6 text-center cursor-pointer rounded-xl hover:border-gray-400 transition-all"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false" @drop="handleDrop" @click="$refs.fileInput.click()">
      <input ref="fileInput" type="file" multiple :accept="accept" class="hidden" @change="handleFileSelect" />
      <ArrowUpTrayIcon class="mx-auto h-10 w-10 text-gray-500" />
      <p class="text-gray-600 mt-2">{{ $t('verification.dragAndDrop') }}</p>
    </div>
    <p v-if="uploadError" class="mt-2 text-sm/6 text-danger-600" role="alert">{{ uploadError }}</p>

    <div v-if="files.length" class="mt-4 space-y-3">
      <div v-for="(file, index) in files" :key="index"
           class="flex items-center justify-between p-3 rounded-lg transition-all duration-300 relative"
           :class="{
             'bg-warning-100 animate-pulse': (file.status === 'pending' || file.status === 'preparing'),
             'bg-brand-700/20': file.status === 'uploading',
             'bg-success-100': file.status === 'completed',
             'bg-danger-100': file.status === 'failed'
           }">
        <div class="flex items-center space-x-3">
          <ArrowPathIcon v-if="file.status === 'pending' || file.status === 'preparing'" class="w-5 h-5 mr-2 text-warning-700 animate-spin" />
          <Spinner v-if="file.status === 'uploading'" class="w-5 h-5 mr-2" />
          <CheckCircleIcon v-else-if="file.status === 'completed'" class="text-success-700 w-5 h-5 mr-2" />
          <XCircleIcon v-else-if="file.status === 'failed'" class="text-danger-700 w-5 h-5 mr-2" />
          <span :class="{
            'text-warning-700': file.status === 'pending',
            'text-brand-700': file.status === 'uploading',
            'text-success-700': file.status === 'completed',
            'text-danger-700': file.status === 'failed'
          }" class="truncate text-sm/6 max-w-xs">{{ file.name }}</span>
        </div>
        <button v-if="file.status === 'failed'" type="button" @click="uploadFile(file)" class="ml-2 inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-sm/6 font-semibold text-danger-800 underline underline-offset-2">{{ $t('common.tryAgain') }}</button>
        <button @click="removeFile(index)" class="text-gray-500 text-sm/6 hover:text-gray-700 cursor-pointer">
          <TrashIcon class="w-4 h-4" />
        </button>
        <div v-if="file.status === 'uploading'" class="absolute bottom-0 left-0 h-1 bg-brand-700 transition-all" :style="{ width: file.progress + '%' }"></div>
      </div>
    </div>
    <ul v-if="files.some((file) => file.status === 'failed' && file.reason)" class="mt-2 space-y-1" role="alert">
      <li v-for="(file, index) in files.filter((file) => file.status === 'failed' && file.reason)" :key="`reason-${index}`" class="text-sm/6 text-danger-700">{{ file.name }}: {{ file.reason }}</li>
    </ul>
    <form @submit.prevent="save">
      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div v-if="documentType.documentNumberLabel">
          <label :for="`document-number-${documentType.id}`" class="block text-sm/6 font-medium text-gray-900">{{ documentType.documentNumberLabel }}</label>
          <input :id="`document-number-${documentType.id}`" v-model.trim="documentNumber" type="text" autocomplete="off" class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm/6 focus:outline-2 focus:-outline-offset-2 focus:outline-brand-600" />
        </div>
        <div>
          <label :for="`expiry-date-${documentType.id}`" class="block text-sm/6 font-medium text-gray-900">{{ $t('verification.expiryDate') }} <span class="font-normal text-gray-500">{{ $t('verification.expiryDateOptional') }}</span></label>
          <input :id="`expiry-date-${documentType.id}`" v-model="expiryDate" type="date" class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm/6 focus:outline-2 focus:-outline-offset-2 focus:outline-brand-600" />
        </div>
      </div>
      <button :disabled="isUploading || isSaving || !files.length" type="submit" class="mt-6 block w-full bg-brand-700 text-white text-center py-3.5 rounded-xl font-medium transition cursor-pointer hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand-700">
        <template v-if="isSaving">
          <span class="flex items-center justify-center whitespace-nowrap">
            <Spinner class="size-4 mr-2" />{{ $t('verification.uploading') }}</span>
        </template>
        <template v-else-if="isUploading">
          <span class="flex items-center justify-center whitespace-nowrap">{{ $t('recipient.pleaseWait') }}</span>
        </template>
        <template v-else>{{ $t('verification.upload') }}</template>
      </button>
      <InlineFailure :message="saveFailure" />
    </form>
  </div>
</template>