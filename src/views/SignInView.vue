<script setup>
import {reactive, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import router from "@/router/index.js";
import {useCustomerStore} from "@/stores/customer.js";
import axios from "axios";

const showPassword = ref(false);
const customerUtils = useCustomerUtils();
const customerStore = useCustomerStore();
const form = reactive({
  email: '',
  password: '',
});
const isLoading = ref(false);
const loginError = ref(null);

async function login() {
  isLoading.value = true;
  loginError.value = null;
  await axios.get('/sanctum/csrf-cookie');
  await customerUtils.login(form.email, form.password).then(() => {
    if (customerStore.customer.data?.account?.isEmailVerified && customerStore.customer.data?.session?.mfaMethod !== null) {
      router.push({name: 'multiFactorAuth'});
    } else {
      router.push({name: 'onboardingWorkflow'});
    }

  }).catch((e) => {
    loginError.value = e.response?.data?.message;
    console.error(e);
  }).finally(() => {
    isLoading.value = false;
  })
}

const appUrl = import.meta.env.VITE_APP_URL;
</script>
<template>
  <main>
    <!-- Background Wrapper -->
    <div
      class="min-h-screen flex items-center justify-center bg-no-repeat bg-center bg-cover"
      style="background-image: url('/images/backgrounds/login.png');"
    >
      <!-- Overlay Gradient (for readability like design) -->
      <!-- <div class="absolute inset-0 bg-gradient-to-r from-green-300/70 via-teal-400/70 to-green-500/70"></div> -->

      <!-- Loader -->
      <i v-if="isLoading" class="pi pi-spin pi-spinner text-5xl text-white z-10"></i>

      <!-- Card -->
      <div v-else class="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

        <!-- Logo -->
        <div class="text-center mb-6">
          <img src="/images/logo.png" class="h-12 md:h-16 mx-auto mb-3" />
          <p class="text-xs text-gray-400">
            Secure access to your global movement portal.
          </p>
        </div>

        <!-- Heading -->
        <h2 class="text-xl font-semibold text-center mb-6">Welcome Back</h2>

        <!-- Error -->
        <div v-if="loginError" class="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
          {{ loginError }}
        </div>

        <!-- Form -->
        <form @submit.prevent="login" class="space-y-4">

          <!-- Email -->
          <div>
            <label class="text-xs text-gray-500 mb-1 block">EMAIL ADDRESS</label>
            <input
              type="email"
              v-model="form.email"
              placeholder="name@company.com"
              class="w-full px-4 py-3 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          <!-- Password -->
          <div>
            <label class="text-xs text-gray-500 mb-1 block">PASSWORD</label>
            <div class="relative">
              <input
                :type="showPassword ? 'text' : 'password'"
                v-model="form.password"
                placeholder="••••••••"
                class="w-full px-4 py-3 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-teal-400"
              />
              <span
                @click="showPassword = !showPassword"
                class="absolute right-3 top-3 cursor-pointer text-gray-400"
              >
                <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
              </span>
            </div>
          </div>

           <!-- Bottom Row -->
           <div class="flex items-center justify-between text-sm mt-2">
            <label class="flex items-center gap-2 text-gray-600">
              <input type="checkbox" class="accent-teal-500" />
              Remember me
            </label>

            <router-link
              :to="{name: 'forgotPassword'}"
              class="text-teal-500 hover:underline"
            >
              Forgot password?
            </router-link>
          </div>

          <!-- Button -->
          <button
            :disabled="isLoading"
            :class="{'opacity-70': isLoading}"
            type="submit"
            class="w-full py-3 rounded-full bg-brand-700 hover:bg-teal-500 text-white font-medium transition"
          >
            Secure Log In →
          </button>

          <!-- Signup -->
          <p class="text-center text-sm text-gray-500 mt-4">
            New to Payvel? 
            <router-link :to="{name: 'signUp'}" class="text-teal-500 hover:underline">
               Create Account
            </router-link>
          </p>

        </form>
      </div>
    </div>
  </main>
</template>