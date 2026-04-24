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
    <!-- Background Wrapper -->
    <div
      class="min-h-screen flex items-center justify-center bg-no-repeat bg-center bg-cover relative"
      style="background-image: url('/images/backgrounds/login.png');"
    >
      <!-- Loader -->
      <i
        v-if="isLoading"
        class="pi pi-spin pi-spinner text-5xl text-white z-20"
      ></i>

      <!-- Card -->
      <div
        v-else
        class="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl p-8"
      >
        <!-- Logo -->
        <div class="text-center mb-6">
          <img src="/images/logo.png" class="h-12 md:h-16 mx-auto mb-3" />
          <p class="text-xs text-gray-400">
            Reset your account access securely
          </p>
        </div>

        <!-- Heading -->
        <h2 class="text-xl font-semibold text-center mb-4">
          Forgot Password
        </h2>

        <p class="text-sm text-gray-400 text-center mb-6">
          Enter your email and we’ll send you a secure reset link.
        </p>

        <!-- Form -->
        <form @submit.prevent="requestResetPassword" class="space-y-4">

          <!-- Message -->
          <div
            v-if="forgotPasswordMessage"
            class="bg-blue-50 border border-blue-100 text-blue-700 text-sm p-3 rounded"
          >
            {{ forgotPasswordMessage }}
          </div>

          <!-- Email -->
          <div>
            <div class="relative">
              <input
                type="email"
                id="email"
                v-model="form.email"
                placeholder="example@email.com"
                class="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-400"
              />
              <span class="absolute right-3 top-3 text-gray-400">
                <i class="pi pi-envelope"></i>
              </span>
            </div>
          </div>

          <!-- Button -->
          <button
            :disabled="isLoading"
            :class="{'opacity-70': isLoading}"
            type="submit"
            class="w-full py-3 rounded-full bg-brand-700 hover:bg-brand-500 text-white font-medium transition"
          >
            Send Reset Link
          </button>

          <!-- Back to login -->
          <p class="text-center text-sm text-gray-500 mt-4">
            Changed your mind?
            <router-link
              :to="{name: 'signIn'}"
              class="text-teal-500 hover:underline"
            >
              Sign in instead
            </router-link>
          </p>

        </form>
      </div>
    </div>
  </main>
</template>