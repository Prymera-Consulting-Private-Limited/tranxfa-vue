<script setup>
import {reactive, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import axios from "axios";

const customerUtils = useCustomerUtils();
const form = reactive({
  email: '',
});
const isLoading = ref(false);
const forgotPasswordMessage = ref(null);
const emailFocused = ref(false);

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
          <img src="/images/backgrounds/resetpassword.png" alt="Login Background" class="w-full h-90 md:h-full object-cover hidden md:block">
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
              <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-h-20 mb-5"></a>
            </div>
            <!-- Form Header -->
            <h2 class="text-2xl font-bold text-black mb-2">Forgot Password</h2>
            <p class="text-sm text-[#B7A3C1] mb-6 ">Forgot your password? No problem. Enter the email linked to your account and click "Send Reset Link." We'll email you a secure link to reset your password.</p>
            <!-- Form -->
            <form @submit.prevent="requestResetPassword" class="space-y-5">
              <div v-if="forgotPasswordMessage" class="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p class="text-sm text-blue-700">{{ forgotPasswordMessage }}</p>
              </div>

              <div>
                <label for="email" class="mb-2 block font-medium text-brand-700">Email</label>
                <div
                  class="relative rounded-2xl border bg-white transition-all duration-200"
                  :class="emailFocused ? 'border-brand-700 ring-4 ring-brand-700/10' : 'border-gray-200 hover:border-gray-300'"
                >
                  <input
                    type="email"
                    id="email"
                    v-model="form.email"
                    placeholder="example@email.com"
                    class="w-full rounded-2xl border-0 bg-transparent py-3 pl-4 pr-12 text-gray-900 outline-none placeholder:text-gray-400"
                    @focus="emailFocused = true"
                    @blur="emailFocused = false"
                  >
                  <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                    <i class="pi pi-envelope transition-colors" :class="emailFocused ? 'text-brand-700' : 'text-gray-400'"></i>
                  </span>
                </div>
              </div>

              <button
                :disabled="isLoading"
                type="submit"
                class="group relative block w-full overflow-hidden rounded-full bg-brand-700 py-3.5 text-center text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-800 hover:shadow-md active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span class="inline-flex items-center justify-center gap-2">
                  <i v-if="isLoading" class="pi pi-spin pi-spinner text-sm"></i>
                  Send Reset Link
                  <i v-if="!isLoading" class="pi pi-arrow-right text-sm transition-transform duration-200 group-hover:translate-x-0.5"></i>
                </span>
              </button>

              <p class="mt-2 text-center text-sm text-gray-600">
                Changed mind?
                <router-link
                  :to="{name: 'signIn'}"
                  class="ml-1 inline-flex items-center rounded-full px-2 py-0.5 font-medium text-brand-700 transition-colors hover:bg-brand-50 hover:underline"
                >
                  Sign in instead
                </router-link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
