<script setup>
import {computed, onMounted, reactive, ref} from "vue";
import router from "@/router/index.js";
import {usePasswordPolicyStore} from "@/stores/password_policy.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {usePasswordPolicyUtils} from "@/composables/password_policy_utils.js";
import axios from "axios";

const isLoading = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);

const props = defineProps({
  token: String,
});

const form = reactive({
  password: '',
  confirm_password: '',
});
const formErrors = reactive({
  password: [],
  confirm_password: [],
});
const resetPasswordFailureMessage = ref('');
const passwordPolicyStore = usePasswordPolicyStore();
const customerUtils = useCustomerUtils();
const passwordPolicyUtils = usePasswordPolicyUtils();
const validatedPasswordPolicies = reactive({
  rules: [],
});

onMounted(async () => {
  if (! passwordPolicyStore.isLoaded) {
    isLoading.value = true;
    await passwordPolicyUtils.getPolicy().catch((e) => {
      console.error(e);
    }).finally(() => {
      isLoading.value = false
    });
  }
  validatedPasswordPolicies.rules = [];
  for (const rule of passwordPolicyStore.rules) {
    validatedPasswordPolicies.rules.push({
      id: rule.id,
      message: rule.message,
      regex: rule.regex,
      value: rule.value,
      outcome: computed(() => {
        if (rule.id === 'length') {
          return rule.value <= form.password.length;
        } else {
          if (rule.regex) {
            const regexPattern = rule.regex.replace(/^\/|\/$/g, "");
            const expression = new RegExp(regexPattern);

            return expression.test(form.password);
          }
        }
      }),
    });
  }
})

async function resetPassword() {
  isLoading.value = true;
  formErrors.password = [];
  formErrors.confirm_password = [];
  resetPasswordFailureMessage.value = '';
  await axios.get('/sanctum/csrf-cookie');
  customerUtils.resetPassword(props.token, form.password, form.confirm_password).then(() => {
    router.push({name: 'signIn', query: {referer: "reset-password"}});
  }).catch((e) => {
    if (e.status === 422) {
      const errors = e.response.data.errors;
      if (typeof errors.password !== 'undefined') {
        formErrors.password = errors.password;
      }
      if (typeof errors.confirm_password !== 'undefined') {
        formErrors.confirm_password = errors.confirm_password;
      }
      if (typeof errors.token !== 'undefined') {
        resetPasswordFailureMessage.value = errors.token[0];
      }
    } else {
      resetPasswordFailureMessage.value = e.response.data?.message;
    }
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
        class="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-xl p-8"
      >
        <!-- Logo -->
        <div class="text-center mb-6">
          <img src="/images/logo.png" class="h-12 md:h-16 mx-auto mb-3" />
          <p class="text-xs text-gray-400">
            Securely reset your password
          </p>
        </div>

        <!-- Heading -->
        <h2 class="text-xl font-semibold text-center mb-6">
          Reset Password
        </h2>

        <!-- Form -->
        <form @submit.prevent="resetPassword" class="space-y-5">

          <!-- Error -->
          <div
            v-if="resetPasswordFailureMessage"
            class="bg-red-50 border border-red-100 text-red-700 text-sm p-3 rounded"
          >
            {{ resetPasswordFailureMessage }}
          </div>

          <!-- Password -->
          <div>
            <label
              :class="[formErrors.password.length > 0 ? 'text-red-700' : 'text-gray-500']"
              class="text-xs block mb-1"
            >
              CHOOSE PASSWORD
            </label>

            <div class="relative">
              <input
                :type="showPassword ? 'text' : 'password'"
                v-model="form.password"
                placeholder="••••••••"
                :class="[formErrors.password.length > 0 ? 'border-red-500 text-red-500' : 'border-gray-200']"
                class="w-full px-4 py-3 bg-gray-100 border rounded-lg outline-none focus:ring-2 focus:ring-teal-400"
              />

              <span
                @click="showPassword = !showPassword"
                class="absolute right-3 top-3 cursor-pointer text-gray-400"
              >
                <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
              </span>
            </div>

            <p v-if="formErrors.password.length > 0" class="text-xs text-red-500 mt-1">
              {{ formErrors.password[0] }}
            </p>
          </div>

          <!-- Password Rules -->
          <ul class="space-y-1">
            <li v-for="validatedPasswordPolicyRule in validatedPasswordPolicies.rules">
              <div class="flex items-center gap-2 text-xs">
                <i
                  v-if="validatedPasswordPolicyRule?.outcome === true"
                  class="pi pi-check-circle text-emerald-500"
                ></i>
                <i
                  v-else-if="validatedPasswordPolicyRule?.outcome === false"
                  class="pi pi-times-circle text-red-500"
                ></i>
                <i v-else class="pi pi-circle text-gray-400"></i>

                <span
                  :class="[
                    validatedPasswordPolicyRule?.outcome === true
                      ? 'text-emerald-500'
                      : validatedPasswordPolicyRule?.outcome === false
                      ? 'text-red-500'
                      : 'text-gray-400'
                  ]"
                >
                  {{ validatedPasswordPolicyRule.message }}
                </span>
              </div>
            </li>
          </ul>

          <!-- Confirm Password -->
          <div>
            <label
              :class="[formErrors.confirm_password.length > 0 ? 'text-red-700' : 'text-gray-500']"
              class="text-xs block mb-1"
            >
              CONFIRM PASSWORD
            </label>

            <div class="relative">
              <input
                :type="showConfirmPassword ? 'text' : 'password'"
                v-model="form.confirm_password"
                placeholder="••••••••"
                :class="[formErrors.confirm_password.length > 0 ? 'border-red-500 text-red-500' : 'border-gray-200']"
                class="w-full px-4 py-3 bg-gray-100 border rounded-lg outline-none focus:ring-2 focus:ring-teal-400"
              />

              <span
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-3 cursor-pointer text-gray-400"
              >
                <i :class="showConfirmPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
              </span>
            </div>

            <p v-if="formErrors.confirm_password.length > 0" class="text-xs text-red-500 mt-1">
              {{ formErrors.confirm_password[0] }}
            </p>
          </div>

          <!-- Button -->
          <button
            :disabled="isLoading"
            :class="[!isLoading ? 'bg-brand-700 hover:bg-brand-500' : 'opacity-60 cursor-not-allowed']"
            type="submit"
            class="w-full py-3 text-white rounded-full font-medium transition"
          >
            Continue
          </button>

        </form>
      </div>
    </div>
  </main>
</template>
