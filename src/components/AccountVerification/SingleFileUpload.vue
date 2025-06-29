<script setup>
import {reactive, ref} from "vue";
import { IdentificationIcon, DocumentTextIcon } from "@heroicons/vue/24/outline";
import { useAwsS3Utils } from "@/composables/aws_s3_utils.js";
import { useCustomerUtils } from "@/composables/customer_utils.js";
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";

const customerUtils = useCustomerUtils();
const s3Utils = useAwsS3Utils();

const props = defineProps({
  page: {
    type: String,
    required: true,
  },
  documentCategory: {
    type: Object(DocumentCategory),
    required: true,
  },
  documentType: {
    type: Object(DocumentType),
    required: true,
  }
});

const fileInput = ref(null);
const filePreview = ref(null);
const isDragging = ref(false);
const error = ref(null);
const file = reactive({
  file: fileInput?.value?.files[0] || null,
  status: '',
  progress: 0,
  path: '',
});

const selectFile = () => fileInput.value.click();

const handleFileInput = (event) => {
  if (event.target.files.length > 0) {
    file.file = event.target.files[0];
    processFile();
  }
};

const handleDrop = (event) => {
  isDragging.value = false;
  if (event.dataTransfer.files.length > 0) {
    file.file = event.dataTransfer.files[0];
    processFile();
  }
};

const emit = defineEmits(["fileSelected"]);

const processFile = async () => {
  if (!file.file.type.startsWith("image/")) {
    error.value = "Only images are allowed!";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    filePreview.value = reader.result;
  };
  reader.readAsDataURL(file.file);
  emit("fileSelected", file);
  file.status = "pending";
  file.progress = 0;
  file.path = null;
  file.status = "preparing";

  const response = await customerUtils.getAccountVerificationToken(props.documentCategory, props.documentType, file.file);
  error.value = null;
  file.status = "uploading";

  await s3Utils.uploadToPreSignedS3Url(response.data.token, file.file).then(() => {
    file.path = new URL(response.data.token).pathname.split("/").slice(2).join("/");
    file.status = "completed";
  }).catch(() => {
    error.value = "Something went wrong. Please try again!";
    file.status = "failed";
  });
};

const removeFile = () => {
  filePreview.value = null;
  fileInput.value.value = "";
  file.file = null;
  file.status = '';
  file.progress = 0;
  file.path = '';
};
</script>

<template>
  <div class="relative w-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all hover:border-brand-500 hover:bg-brand-50 p-1"
       :class="{
      'border-brand-500 bg-brand-50': isDragging,
      'border-gray-300 bg-white': !isDragging && !error,
      'border-red-500 bg-red-50': error,
      'px-6 py-4': !filePreview
    }"
       @dragover.prevent="isDragging = true"
       @dragleave.prevent="isDragging = false"
       @drop.prevent="handleDrop"
       @click="selectFile">

    <!-- Loading Effect -->
    <div v-if="['pending', 'preparing', 'uploading'].includes(file.status)" class="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg animate-pulse z-10"></div>

    <!-- File Preview -->
    <div v-if="filePreview" class="flex items-center justify-start w-full gap-x-6">
      <div class="relative mx-auto">
        <img :src="filePreview" class="w-48 h-48 object-cover rounded-md mx-auto" :alt="page" />
        <button class="absolute top-0 right-0 text-white p-1 rounded-full text-xs" @click.stop="removeFile">
          <i class="pi pi-close text-xs"></i>
        </button>
      </div>
    </div>

    <!-- Upload Instructions -->
    <div v-else class="flex-col justify-center space-y-4 gap-x-6 items-center w-full p-5 text-center">
      <IdentificationIcon v-if="page === 'photo'" class="text-gray-400 size-10 mx-auto" />
      <DocumentTextIcon v-else class="text-gray-400 size-10 mx-auto" />
      <div>
        <p class="text-sm text-gray-600">{{ `Click or drag file here to upload ${page} page` }}</p>
        <p v-if="error" class="text-xs text-red-500 mt-1">{{ error }}</p>
      </div>
    </div>

    <input ref="fileInput" type="file" class="hidden" @change="handleFileInput" accept="image/*" />

  </div>
</template>
