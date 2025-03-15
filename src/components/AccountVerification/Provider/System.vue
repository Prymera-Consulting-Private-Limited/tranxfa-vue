<script setup>
import {useCustomerUtils} from "@/composables/customer_utils.js";
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
import {onMounted, ref} from "vue";
import {ArrowUpTrayIcon, TrashIcon, CheckCircleIcon, XCircleIcon} from "@heroicons/vue/24/outline";
import Spinner from "@/components/Spinner.vue";
import axios from "axios";

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

onMounted(async () => {
  emit('sdkInitialized');
})

const isUploading = ref(false);
const isSaving = ref(false);

const files = ref([]);

const handleFileSelect = (event) => {
  Array.from(event.target.files).forEach((file) => {
    files.value.push({ file, name: file.name, size: file.size, status: 'pending' });
  });
  uploadFiles();
};

const handleDrop = (event) => {
  event.preventDefault();
  Array.from(event.dataTransfer.files).forEach((file) => {
    files.value.push({ file, name: file.name, size: file.size, status: 'pending' });
  });
  uploadFiles();
};

const uploadFiles = async () => {
  for (let fileObj of files.value) {
    fileObj.status = 'pending';
    try {
      const preSignedUrl = await getPreSignedUrl(fileObj.file);
      fileObj.status = 'uploading';
      await uploadToS3(preSignedUrl, fileObj.file);
      fileObj.status = 'completed';
    } catch (error) {
      fileObj.status = 'failed';
    }
  }
};

const getPreSignedUrl = async (file) => {
  let accessToken = null;
  await customerUtils.getAccountVerificationToken(props.documentCategory, props.documentType, file).then((response) => {
    accessToken = response.data.token;
  }).catch((e) => {
    console.error(e);
    throw e;
  });

  return accessToken;
};

const uploadToS3 = async (url, file) => {
  await axios.put(url, file, {
    headers: {
      "Content-Type": file.type,
    },
    onUploadProgress: (progressEvent) => {
      let percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
      );
      console.log(`Upload Progress: ${percentCompleted}%`);
    },
  });
};

const removeFile = (index) => {
  files.value.splice(index, 1);
};
</script>
<template>
  <div class="max-w-xl mx-auto p-6 bg-white shadow-xl rounded-2xl">

    <h2 class="text-lg font-semibold text-gray-900 mb-2">Upload {{ documentType.title }}</h2>
    <p class="text-sm text-gray-500 mb-4">Please upload clear images of your <span class="text-brand-700">{{ documentType.title }}</span>.</p>

    <div
        class="border-2 border-dashed border-gray-300 p-6 text-center cursor-pointer rounded-xl hover:border-gray-400 transition-all"
        @dragover.prevent @drop="handleDrop" @click="$refs.fileInput.click()">
      <input ref="fileInput" type="file" multiple class="hidden" @change="handleFileSelect" />
      <ArrowUpTrayIcon class="mx-auto h-10 w-10 text-gray-500" />
      <p class="text-gray-600 mt-2">Drag & drop files here, or click to browse</p>
    </div>

    <div v-if="files.length" class="mt-4 space-y-3">
      <div v-for="(file, index) in files" :key="index"
           class="flex items-center justify-between p-3 rounded-lg transition-all duration-300"
           :class="{
             'bg-yellow-100 animate-pulse': file.status === 'pending',
             'bg-brand-700/20': file.status === 'uploading',
             'bg-emerald-100': file.status === 'completed',
             'bg-red-100': file.status === 'failed'
           }">
        <div class="flex items-center space-x-3">
          <Spinner :class="{
          'text-yellow-700': file.status === 'pending',
          'text-brand-700': file.status === 'uploading',
          }" v-if="file.status === 'uploading' || file.status === 'pending'" class="w-5 h-5 mr-2" />
          <CheckCircleIcon v-else-if="file.status === 'completed'" class="text-emerald-700 w-5 h-5 mr-2" />
          <XCircleIcon v-else-if="file.status === 'failed'" class="text-red-700 w-5 h-5 mr-2" />
          <span :class="{
          'text-yellow-700': file.status === 'pending',
          'text-brand-700': file.status === 'uploading',
          'text-emerald-700': file.status === 'completed',
          'text-red-700': file.status === 'failed'
          }" class="truncate text-sm max-w-xs">{{ file.name }}</span>
        </div>
        <button @click="removeFile(index)" class="text-red-500 text-sm hover:text-red-700 cursor-pointer">
          <TrashIcon class="w-4 h-4" />
        </button>
      </div>
    </div>
    <form>
      <button :disabled="isUploading || isSaving" :class="[{'opacity-70': isUploading || isSaving}]" type="submit" class="mt-6 block w-full bg-brand-700 text-white text-center py-3  rounded-[10px] font-medium hover:bg-brand-800 transition cursor-pointer">
        <template v-if="isSaving">
              <span class="flex items-center justify-center whitespace-nowrap">
                <Spinner :class="'size-4 mr-2'" />
                Uploading ...
              </span>
        </template>
        <template v-else>Upload</template>
      </button>
    </form>
  </div>
</template>