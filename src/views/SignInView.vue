<script setup>
import {reactive, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useNavigationUtils} from "@/composables/navigation_utils.js";
import {useMachine} from "@xstate/vue";
import {onboardingNavigationMachine} from "@/machines/onboarding_navigation_machine.js";

const { snapshot, send } = useMachine(onboardingNavigationMachine, {
  provideActor: true
});
const showPassword = ref(false);
const customerUtils = useCustomerUtils();
const navUtils = useNavigationUtils(snapshot, send)
const form = reactive({
  email: '',
  password: '',
});
const isLoading = ref(false);
const loginError = ref(null);

async function login() {
  isLoading.value = true;
  loginError.value = null;
  await customerUtils.login(form.email, form.password).then(() => {
    navUtils.redirectOnboarding(customerUtils.customer);
  }).catch((e) => {
    loginError.value = e.response?.data?.message;
    console.error(e);
  }).finally(() => {
    isLoading.value = false;
  })
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
            <div class="hidden md:block">
              <a href="javascript:"><img src="/images/logo.png" alt="Tranxfa Logo" class="w-auto max-w-sm"></a>
            </div>
            <!-- Form Header -->
            <h2 class="text-2xl font-bold text-black mb-2">Love to see you again</h2>
            <p class="text-sm text-[#B7A3C1] mb-6 ">Send your money transfer easy and Fun!</p>
            <!-- Form -->
            <form @submit.prevent="login" class="space-y-6">
              <div v-if="loginError" class="rounded-md bg-red-50 p-4">
                <div class="flex">
                  <div class="">
                    <h3 class="text-sm font-medium text-red-800">Login failed</h3>
                    <div class="mt-2 text-sm text-red-700">
                      {{ loginError }}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label for="email" class="block text-purple-700 mb-3">Email</label>
                <div class="relative">
                  <input type="email" id="email" v-model="form.email" placeholder="example@email.com" class="w-full px-4 py-2 border-b border border-gray-300 rounded-lg">
                  <button type="button" class="absolute inset-y-0 right-0 top-1 flex items-center px-3">
                    <span class="pi pi-envelope w-5 h-5 text-gray-400"></span>
                  </button>
                </div>
              </div>

              <!-- Password Field -->
              <div>
                <label for="password" class="block text-purple-700 mb-3">Password</label>
                <div class="relative">
                  <input :type="showPassword ? 'text' : 'password'" id="password" v-model="form.password" placeholder="••••••••" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  <button type="button" class="absolute inset-y-0 right-0 top-1.5 flex items-center px-3 cursor-pointer">
                    <span @click="showPassword = !showPassword" v-if="showPassword" class="pi pi-eye-slash w-5 h-5 text-gray-400"></span>
                    <span @click="showPassword = !showPassword" v-else class="pi pi-eye w-5 h-5 text-gray-400"></span>
                  </button>
                </div>
              </div>

              <!-- Remember Me & Forgot Password -->
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center">
                  <input id="remember-me" type="checkbox" class="w-4 h-4 text-purple-700 border-gray-300 rounded focus:ring-purple-700 focus:ring-0 outline-none accent-purple-700">
                  <label for="remember-me" class="ml-2 text-sm text-gray-600">Remember me</label>
                </div>
                <a href="javascript:" class="text-sm text-purple-600 hover:text-purple-800 hover:underline">Forgot password?</a>
              </div>

              <!-- Submit Button -->
              <button type="submit" class="block w-full bg-purple-700 text-white text-center py-3  rounded-[10px] font-medium hover:bg-purple-800 transition cursor-pointer">Continue</button>
              <!-- Sign Up Link -->
              <p class="mt-4 text-center text-sm text-gray-600">
                Don’t have an account? <router-link :to="'/sign-up'" class="text-purple-600 hover:text-purple-800 hover:underline">Sign up instead</router-link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>