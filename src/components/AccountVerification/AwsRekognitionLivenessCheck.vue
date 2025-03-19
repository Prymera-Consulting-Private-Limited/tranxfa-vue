<script setup>
import {onMounted, onUnmounted, ref} from "vue";
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import * as faceDetection from "@tensorflow-models/face-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

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

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();

/**
 * @type {{data: Customer | null}}
 */
const customer = customerStore.customer;

const cameraAccess = ref(false);
const video = ref(null);

const liveCheckMessage = ref("");
const liveCheckSuccess = ref("");
const liveCheckError = ref("");
const liveCheckWarning = ref("");

let stream = null;
let faceDetector = null;
let faceDetectionInterval = null;

const isInitialized = ref(false);
const isProcessing = ref(false);

const emit = defineEmits(['sdkInitialized', 'sdkError', 'sdkStepCompleted', 'sdkApplicantStatusChanged']);


const setupTensorFlowBackend = async () => {
  await tf.setBackend("webgl");
};

const startFaceDetection = async () => {
  if (!faceDetector) {
    console.error("Face detector not initialized");
    return;
  }

  faceDetectionInterval = setInterval(async () => {
    try {
      const faceCount = await detectFaceInFrame();
      if (faceCount === 0) {
        liveCheckMessage.value = "";
        liveCheckError.value = "No face detected. Please ensure your face is clearly visible.";
      } else if (faceCount > 1) {
        liveCheckMessage.value = "";
        liveCheckError.value = "Multiple faces detected. Please be alone in the frame.";
      } else {
        liveCheckMessage.value = "Hold still while we verify your identity...";
        liveCheckError.value = "";
        if (!isProcessing.value) {
          isProcessing.value = true;
          //const accessToken = await getLivelinessToken();
          //await beginTest(accessToken);
        }
      }
    } catch (error) {
      console.error("Face detection error:", error);
    }
  }, 1000);
};

const detectFaceInFrame = async () => {
  if (!faceDetector) {
    console.error("Face detector is not ready yet");
    return 0;
  }

  if (!video.value || !video.value.videoWidth) {
    console.error("Video element not ready");
    return 0;
  }

  const faces = await faceDetector.estimateFaces(video.value);
  return faces.length;
};

const startCamera = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    cameraAccess.value = true;
    video.value.srcObject = stream;
    video.value.play();
    faceDetector = await faceDetection.createDetector(faceDetection.SupportedModels.MediaPipeFaceDetector, {
      runtime: "tfjs",
      modelType: "full",
      maxFaces: 5,
    });
    await startFaceDetection();
  } catch (err) {
    console.error("Camera Access Error:", err);
    liveCheckError.value = "Camera access denied. Please grant permission.";
  }
};

const getLivelinessToken = async () => {
  let accessToken = null;
  await customerUtils.getLivelinessToken('system').then((response) => {
    accessToken = JSON.parse(atob(response.data.token));
  }).catch((e) => {
    console.error(e);
    throw e;
  });

  return accessToken;
};

const stopCamera = () => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
};

onMounted(async () => {
  await setupTensorFlowBackend();
  await startCamera();
  isInitialized.value = true;
  emit('sdkInitialized');
})

onUnmounted(() => {
  video?.value?.stop();
  stopCamera();
  liveCheckMessage.value = "";
  liveCheckSuccess.value = "";
  liveCheckError.value = "";
  liveCheckWarning.value = "";
  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval);
    faceDetectionInterval = null;
  }
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
      <p class="leading-6 text-gray-400 text-xs mt-3 text-center">All data is processed in accordance with our privacy policy.</p>
    </div>
  </div>
</template>

<style scoped>
video {
  transform: scaleX(-1); /* Mirror effect */
}
</style>