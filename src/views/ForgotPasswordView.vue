<script setup>
import {reactive, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCustomerStore} from "@/stores/customer.js";
import axios from "axios";

const customerUtils = useCustomerUtils();
const customerStore = useCustomerStore();
const form = reactive({
  email: '',
});
const isLoading = ref(false);
const forgotPasswordMessage = ref(null);

async function requestResetPassword() {
  isLoading.value = true;
  forgotPasswordMessage.value = null;
  await axios.get('/sanctum/csrf-cookie');
  await customerUtils.forgotPassword(form.email).then((response) => {
    forgotPasswordMessage.value = response?.data?.message;
    form.email = '';
  }).catch((e) => {
    forgotPasswordMessage.value = e.response?.data?.message;
    console.error(e);
  }).finally(() => {
    isLoading.value = false;
  })
}
</script>
<template>
  <main>
    <div class="relative flex items-center justify-center min-h-screen bg-gray-50 tracking-wider">
      <i v-if="isLoading" class="pi pi-spin pi-spinner text-5xl text-brand-700 bg-white/10"></i>
      <div v-else class="relative flex flex-col md:flex-row w-full h-screen bg-white">
        <div class=" w-[60%] md:w-[60%] h-auto md:h-full">
          <img src="/images/backgrounds/forgot-password.png" alt="Login Background" class="w-full h-90 md:h-full object-cover hidden md:block">
          <!-- Logo and Cross in Mobile View -->
          <div class="absolute top-4 left-4 md:hidden flex items-center justify-between w-full px-4">
            <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-h-16 mb-5"></a>
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
            <div class="hidden md:block">
              <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-h-40 mb-5"></a>
            </div>
            <!-- Form Header -->
            <h2 class="text-2xl font-bold text-black mb-2">Forgot Password</h2>
            <p class="text-sm text-[#B7A3C1] mb-6 ">Forgot your password? No problem. Enter the email linked to your account and click "Send Reset Link." We'll email you a secure link to reset your password.</p>
            <!-- Form -->
            <form @submit.prevent="requestResetPassword" class="space-y-6">
              <div v-if="forgotPasswordMessage" class="rounded-md bg-blue-50 border-blue-100 border p-4">
                <div class="flex">
                  <div class="text-sm text-blue-700">
                    {{ forgotPasswordMessage }}
                  </div>
                </div>
              </div>

              <div>
                <div class="relative">
                  <input type="email" id="email" v-model="form.email" placeholder="example@email.com" class="w-full px-4 py-2 border-b border border-gray-300 rounded-lg">
                  <button type="button" class="absolute inset-y-0 right-0 top-1 flex items-center px-3">
                    <span class="pi pi-envelope w-5 h-5 text-gray-400"></span>
                  </button>
                </div>
              </div>
              <!-- Submit Button -->
              <button :disabled="isLoading" :class="{'opacity-70': isLoading}" type="submit" class="block w-full bg-brand-700 text-white text-center py-3  rounded-[10px] font-medium hover:bg-brand-800 transition cursor-pointer">Send Reset Link</button>
              <!-- Sign Up Link -->
              <p class="mt-4 text-center text-sm text-gray-600">
                Changed mind? <router-link :to="{name: 'signIn'}" class="text-brand-700 hover:text-brand-700 hover:underline">Sign in instead</router-link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>