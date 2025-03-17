<script setup>
import {onMounted, onUnmounted, ref} from "vue";
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useAwsS3Utils} from "@/composables/aws_s3_utils.js";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();
const awsS3Utils = useAwsS3Utils();

/**
 * @type {{data: Customer | null}}
 */
const customer = customerStore.customer;

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

const video = ref(null);
const cameraAccess = ref(false);

const liveCheckMessage = ref("");
const liveCheckSuccess = ref("");
const liveCheckError = ref("");
const liveCheckWarning = ref("");

const isInitialized = ref(false);

const emit = defineEmits(['sdkInitialized', 'sdkError', 'sdkStepCompleted', 'sdkApplicantStatusChanged']);

const isRecording = ref(false);
const recordedChunks = ref([]);
const mediaRecorder = ref(null);
const videoUrl = ref("");
let stream = null;

const startCamera = async () => {
  stream = await navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    cameraAccess.value = true;

    return stream;
  }).catch((err) => {
    console.error(err);
    cameraAccess.value = false;
  });
  if (cameraAccess.value === true) {
    video.value.srcObject = stream;
  }
};

const startRecording = () => {
  recordedChunks.value = [];
  const options = { mimeType: "video/webm" };
  mediaRecorder.value = new MediaRecorder(stream, options);

  mediaRecorder.value.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.value.push(event.data);
    }
  };

  mediaRecorder.value.onstop = async () => {
    const videoBlob = new Blob(recordedChunks.value, { type: "video/webm" });
    videoUrl.value = URL.createObjectURL(videoBlob); // Preview Video
    await uploadToS3(videoBlob);
  };

  mediaRecorder.value.start();
  isRecording.value = true;
};

const getPreSignedUrl = async () => {
  let accessToken = null;
  await customerUtils.getLivelinessToken('system').then((response) => {
    accessToken = response.data.token;
  }).catch((e) => {
    console.error(e);
    throw e;
  });

  return accessToken;
};

const uploadToS3 = async (videoBlob) => {
  const fileBuffer = await videoBlob.arrayBuffer();
  const fileObj = new Blob([fileBuffer], { type: videoBlob.type });
  const url = await getPreSignedUrl();

  awsS3Utils.uploadToPreSignedS3Url(url, fileObj, (progress) => {
    console.log(progress);
  }).then(() => {
    liveCheckSuccess.value = "Liveliness check completed successfully.";
    emit('sdkStepCompleted');
  }).catch((e) => {
    console.error(e);
    liveCheckError.value = "An error occurred while processing the video. Please try again.";
  });
}

const stopRecording = () => {
  mediaRecorder.value.stop();
  isRecording.value = false;
};

const stopCamera = () => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
};

onMounted(async () => {
  await startCamera();
  isInitialized.value = true;
  emit('sdkInitialized');
})

onUnmounted(() => {
  stopCamera();
});
</script>

<template>
  <div :class="{'min-h-128': !isInitialized}" class="flex flex-col items-center justify-center bg-gray-50 text-gray-800 p-6">
    <div v-if="!cameraAccess" class="text-center">
      <p class="text-lg font-semibold mb-4">We Need Camera Access</p>
      <button @click="startCamera" class="bg-brand-700 text-white px-6 py-2 rounded-lg shadow-lg transition cursor-pointer">
        Grant Access
      </button>
    </div>
    <div v-show="isInitialized" class="w-full flex flex-col items-center justify-center">
      <h2 class="text-lg font-semibold mb-4">Liveliness Test</h2>
      <p class="leading-6 text-gray-500 mb-3 text-center">To verify your identity, we kindly request you to record a short video. Please ensure your face is clearly visible in the frame.</p>
      <p v-if="liveCheckMessage" class="leading-6 text-gray-400 mb-3 text-center">{{ liveCheckMessage }}</p>
      <p v-if="liveCheckSuccess" class="leading-6 text-emerald-500 font-semibold mb-3 text-center">{{ liveCheckSuccess }}</p>
      <p v-if="liveCheckError" class="leading-6 text-red-500 mb-3 text-center animate-pulse">{{ liveCheckError }}</p>
      <p v-if="liveCheckWarning" class="leading-6 text-yellow-500 mb-3 text-center">{{ liveCheckWarning }}</p>
      <div class="relative h-72 w-72 bg-black rounded-full overflow-hidden border-6 p-4 border-gray-300">
        <video ref="video" autoplay playsinline class="w-full h-full transform scale-160"></video>
      </div>

      <div class="mt-4">
        <button v-if="!isRecording" @click="startRecording" class="bg-green-600 text-white px-6 py-2 rounded-lg shadow-lg">
          Start Recording
        </button>
        <button v-if="isRecording" @click="stopRecording" class="bg-red-600 text-white px-6 py-2 rounded-lg shadow-lg">
          Stop Recording
        </button>
      </div>
      <p class="leading-6 text-gray-400 text-xs mt-3 text-center">All data is processed in accordance with our privacy policy.</p>
    </div>
  </div>
</template>

<style scoped>
video {
  transform: scaleX(-1); /* Mirror effect */
}
</style>