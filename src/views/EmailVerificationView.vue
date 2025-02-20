<script setup>
import {onMounted, ref} from "vue";
import {useCustomerStore} from "@/stores/customer.js";
import VOtpInput from "vue3-otp-input";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import router from "@/router/index.js";

const emailVerificationCode = ref('');
const isLoading = ref(false);
const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();
const otpError = ref('');

onMounted(async () => {
  if (! customerStore.isLoaded) {
    isLoading.value = true;
    await customerUtils.refresh();
    isLoading.value = false;
  }
});

async function verifyEmailAddress() {
  isLoading.value = true;
  await customerUtils.verifyEmail(emailVerificationCode.value).then(() => {
    router.replace('/identity')
  }).catch((e) => {
    if (e.status === 422) {
      otpError.value = e.response.data.message;
    } else if (e.status === 401) {
      otpError.value = e.response.data.message;
      router.push('/');
    }
  }).finally(() => {
    isLoading.value = false;
  });
}
</script>
<template>
  <main>
    <div class="relative flex items-center justify-center min-h-screen bg-gray-50 tracking-wider">
      <i v-if="isLoading" class="pi pi-spin pi-spinner text-5xl text-purple-700 bg-white/10"></i>
      <div v-else class="relative flex flex-col md:flex-row w-full h-screen bg-white">
        <div class=" w-[60%] md:w-[60%] h-auto md:h-full">
          <img src="/images/backgrounds/login.png" alt="Login Background" class="w-full h-90 md:h-full object-cover hidden md:block">
          <!-- Logo and Cross in Mobile View -->
          <div class="absolute top-4 left-4 md:hidden flex items-center justify-between w-full px-4">
            <a href="javascript:"><img src="/images/logo.png" alt="Tranxfa Logo" class="w-auto max-w-sm"></a>
            <a href="javascript:" class="text-gray-400 text-3xl hover:text-gray-500 pr-5">
              <i class="pi pi-times"></i>
            </a>
          </div>
          <div class="hidden md:block  absolute top-4 right-4">
            <a href="javascript:" class="text-gray-400 text-3xl hover:text-gray-500 pr-5">
              <i class="pi pi-times"></i>
            </a>
          </div>
        </div>

        <!-- Form Section -->
        <div class="flex-1 flex items-center justify-center p-4 md:p-8">
          <div class="w-full max-w-xl">
            <!-- Logo at Top Left (Desktop)  -->
            <div class="hidden md:block flex items-center justify-center w-full">
              <a href="javascript:"><img src="/images/logo.png" alt="Tranxfa Logo" class="w-auto max-w-sm"></a>
            </div>
            <!-- Form Header -->
            <h2 class="text-2xl font-semibold text-black mb-4 text-center">Verify your Email!</h2>
            <p class="text-md text-[#B7A3C1] mb-8 text-center">We have sent an email verification code to your email {{ customerStore.customer.account?.email }}</p>
            <!-- Form -->
            <form @submit.prevent="verifyEmailAddress" class="space-y-10">
              <div v-if="otpError" class="rounded-md bg-red-50 p-4">
                <div class="flex">
                  <div class="">
                    <div class="text-sm text-red-700">
                      {{ otpError }}
                    </div>
                  </div>
                </div>
              </div>
              <v-otp-input
                  class="flex flex-row items-center justify-between w-full max-w-sm space-x-3 mx-auto"
                  input-classes="w-16 h-16 flex flex-col items-center justify-center text-center px-5 border-b border border-gray-300 rounded-lg text-lg otp-input"
                  separator=""
                  inputType="number"
                  :num-inputs="6"
                  v-model:value="emailVerificationCode"
                  :should-auto-focus="true"
                  :should-focus-order="true"
                  :placeholder="['*', '*', '*', '*', '*', '*']"
                  @on-complete="verifyEmailAddress"
              />
              <div class="mt-6 grid grid-cols-2 gap-4">
                <router-link :to="'/identity'" class="block w-full bg-white text-gray-900 ring-1 shadow-xs ring-gray-300 ring-inset hover:bg-gray-50 focus-visible:ring-transparent text-center py-3  rounded-[10px] font-medium transition cursor-pointer">Skip</router-link>
                <button type="submit" class="block w-full bg-purple-700 text-white text-center py-3  rounded-[10px] font-medium hover:bg-purple-800 transition cursor-pointer">Verify Email</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
<style scoped>

.otp-input::-webkit-inner-spin-button,
.otp-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input::placeholder {
  font-size: 15px;
  text-align: center;
  font-weight: 600;
}
</style>