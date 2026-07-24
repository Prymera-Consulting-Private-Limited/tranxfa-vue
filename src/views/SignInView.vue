<script setup>
import {onMounted, reactive, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import router from "@/router/index.js";
import {useCustomerStore} from "@/stores/customer.js";
import axios from "axios";
import IsdCodeInput from "@/components/IsdCodeInput.vue";
import {useCountryUtils} from "@/composables/country_utils.js";

const authChannel = import.meta.env.VITE_AUTH_CHANNEL ??  'EMAIL';

const showPassword = ref(false);
const rememberMe = ref(false);
const customerUtils = useCustomerUtils();
const customerStore = useCustomerStore();
const form = reactive({});
if (authChannel === 'EMAIL') {
  form.email = '';
  form.password = '';
} else if (authChannel === 'MOBILE_NUMBER') {
  form.country = '';
  form.mobile_number = '';
}
const isLoading = ref(false);
const loginError = ref(null);
const countries = ref([]);
const countryUtils = useCountryUtils();

const emailFocused = ref(false);
const passwordFocused = ref(false);
const mobileFocused = ref(false);

onMounted(async () => {
  if (authChannel === 'MOBILE_NUMBER') {
    isLoading.value = true;
    await countryUtils.getSources();
    countries.value = countryUtils.sources.value;
    isLoading.value = false;
  }
});

async function login() {
  isLoading.value = true;
  loginError.value = null;
  await axios.get('/sanctum/csrf-cookie');
  if (authChannel === 'MOBILE_NUMBER') {
    await customerUtils.getLoginOtp(form.country, form.mobile_number).then(() => {
      const country = countries.value.find(o => o.id === form.country)
      sessionStorage.setItem(
          'otpData',
          JSON.stringify({
            country: country,
            number: form.mobile_number
          })
      );
      router.push({name: 'authByOtp'});
    }).catch((e) => {
      loginError.value = e.response?.data?.message;
      console.error(e);
    }).finally(() => {
      isLoading.value = false;
    })
  } else {
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
}

const appUrl = import.meta.env.VITE_APP_URL;

const itemLabelGenerator = (country) => {
  return '+' + country.callingCode + ' ' + country.commonName;
}

function updateIsdCode(updated) {
  form.country = updated?.id;
}
</script>
<template>
  <main>
    <div class="relative flex items-center justify-center min-h-screen bg-gray-50 tracking-wider">
      <i v-if="isLoading" class="pi pi-spin pi-spinner text-5xl text-brand-700 bg-white/10"></i>
      <div v-else class="relative flex flex-col md:flex-row w-full h-screen bg-white">
        <div class=" w-[60%] md:w-[60%] h-auto md:h-full">
          <img src="/images/backgrounds/login.png" alt="Login Background" class="w-full h-90 md:h-full object-cover hidden md:block">
          <!-- Logo and Cross in Mobile View -->
          <div class="absolute top-4 left-4 md:hidden flex items-center justify-between w-full px-4">
            <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-w-64 max-h-10 mb-5"></a>
            <a :href="appUrl" class="text-gray-400 text-3xl hover:text-gray-500 pr-5">
              <i class="pi pi-times"></i>
            </a>
          </div>
          <div class="hidden md:block  absolute top-4 right-4">
            <a :href="appUrl" class="text-gray-400 text-3xl hover:text-gray-500 pr-5">
              <i class="pi pi-times"></i>
            </a>
          </div>
        </div>

        <!-- Form Section -->
        <div class="flex-1 flex items-center justify-center p-4 md:p-8">
          <div class="w-full max-w-xl">
            <!-- Logo at Top Left (Desktop)  -->
            <div class="hidden md:block">
              <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-w-64 max-h-10 mb-5 -ml-2"></a>
            </div>
            <!-- Form Header -->
            <h2 class="text-2xl font-bold text-black mb-2">Love to see you again</h2>
            <p class="text-sm text-[#B7A3C1] mb-6 ">Send your money transfer easy and Fun!</p>
            <!-- Form -->
            <form @submit.prevent="login" class="space-y-5">
              <div v-if="loginError" class="rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
                <h3 class="text-sm font-medium text-red-800">Login failed</h3>
                <p class="mt-1 text-sm text-red-700">{{ loginError }}</p>
              </div>
              <div v-if="router.currentRoute.value.query?.referer" class="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3">
                <p v-if="router.currentRoute.value.query.referer === 'change-password'" class="text-sm text-blue-700">
                  Your password has been successfully changed. Please log in using your new password.
                </p>
                <p v-if="router.currentRoute.value.query.referer === 'reset-password'" class="text-sm text-blue-700">
                  Your password has been successfully reset. Please log in using your new password.
                </p>
              </div>

              <template v-if="authChannel === 'MOBILE_NUMBER'">
                <div v-if="! isLoading" class="space-y-3">
                  <label for="mobile-number" class="block mb-1 text-base font-medium text-brand-700">Mobile Number</label>
                  <div class="space-y-3">
                    <IsdCodeInput v-bind:countries="countries" v-bind:fetchCountries="false" :class="['min-w-36 sm:min-w-40']" v-bind:modelValue="form.country" v-bind:itemLabelGenerator="itemLabelGenerator" v-on:update:modelValue="updateIsdCode" />
                    <div
                      class="relative rounded-2xl border bg-white transition-all duration-200"
                      :class="mobileFocused ? 'border-brand-700 ring-4 ring-brand-700/10' : 'border-gray-200 hover:border-gray-300'"
                    >
                      <input
                        id="mobile-number"
                        type="tel"
                        v-model="form.mobile_number"
                        class="w-full rounded-2xl border-0 bg-transparent px-4 py-3 text-gray-900 outline-none placeholder:text-gray-400"
                        placeholder="Mobile Number"
                        @focus="mobileFocused = true"
                        @blur="mobileFocused = false"
                      />
                    </div>
                  </div>
                </div>
              </template>
              <template v-else-if="authChannel === 'EMAIL'">
                <div>
                  <label for="email" class="block text-brand-700 mb-2 font-medium">Email</label>
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

                <!-- Password Field -->
                <div>
                  <label for="password" class="block text-brand-700 mb-2 font-medium">Password</label>
                  <div
                    class="relative rounded-2xl border bg-white transition-all duration-200"
                    :class="passwordFocused ? 'border-brand-700 ring-4 ring-brand-700/10' : 'border-gray-200 hover:border-gray-300'"
                  >
                    <input
                      :type="showPassword ? 'text' : 'password'"
                      id="password"
                      v-model="form.password"
                      placeholder="••••••••"
                      class="w-full rounded-2xl border-0 bg-transparent py-3 pl-4 pr-12 text-gray-900 outline-none placeholder:text-gray-400"
                      @focus="passwordFocused = true"
                      @blur="passwordFocused = false"
                    >
                    <button
                      type="button"
                      class="absolute inset-y-0 right-1.5 my-auto flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-brand-700 cursor-pointer"
                      :aria-label="showPassword ? 'Hide password' : 'Show password'"
                      @click="showPassword = !showPassword"
                    >
                      <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
                    </button>
                  </div>
                </div>

                <!-- Remember Me & Forgot Password -->
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <label
                    for="remember-me"
                    class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                    :class="rememberMe ? 'border-brand-200 bg-brand-50 text-brand-700' : ''"
                  >
                    <input
                      id="remember-me"
                      type="checkbox"
                      v-model="rememberMe"
                      class="h-4 w-4 rounded border-gray-300 text-brand-700 accent-brand-700 outline-none focus:ring-0"
                    >
                    Remember me
                  </label>
                  <router-link
                    :to="{name: 'forgotPassword'}"
                    class="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
                  >
                    Forgot password?
                  </router-link>
                </div>
              </template>

              <!-- Submit Button -->
              <button
                :disabled="isLoading"
                type="submit"
                class="group relative block w-full overflow-hidden rounded-full bg-brand-700 py-3.5 text-center text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-800 hover:shadow-md active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span class="inline-flex items-center justify-center gap-2">
                  <i v-if="isLoading" class="pi pi-spin pi-spinner text-sm"></i>
                  {{ authChannel === 'MOBILE_NUMBER' ? 'Get Code' : 'Continue' }}
                  <i v-if="!isLoading" class="pi pi-arrow-right text-sm transition-transform duration-200 group-hover:translate-x-0.5"></i>
                </span>
              </button>

              <!-- Sign Up Link -->
              <p class="mt-2 text-center text-sm text-gray-600">
                Don’t have an account?
                <router-link
                  :to="{name: 'signUp'}"
                  class="ml-1 inline-flex items-center rounded-full px-2 py-0.5 font-medium text-brand-700 transition-colors hover:bg-brand-50 hover:underline"
                >
                  Sign up instead
                </router-link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>