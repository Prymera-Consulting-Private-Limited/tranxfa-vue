<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import router from "@/router/index.js";
import { usePasswordPolicyStore } from "@/stores/password_policy.js";
import { useCustomerUtils } from "@/composables/customer_utils.js";
import { usePasswordPolicyUtils } from "@/composables/password_policy_utils.js";
import axios from "axios";

const thirdPartyDeclaration = import.meta.env.VITE_THIRD_PARTY_SIGNUP_DECLARATION;
const thirdPartyDeclarationAccepted = ref(false);
const isLoading = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const termsAccepted = ref(false);
const form = reactive({
  email: '',
  password: '',
  confirm_password: '',
});
const formErrors = reactive({
  email: [],
  password: [],
  confirm_password: [],
});
const passwordPolicyStore = usePasswordPolicyStore();
const customerUtils = useCustomerUtils();
const passwordPolicyUtils = usePasswordPolicyUtils();
const validatedPasswordPolicies = reactive({
  rules: [],
});

onMounted(async () => {
  if (!passwordPolicyStore.isLoaded) {
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

async function register() {
  isLoading.value = true;
  formErrors.email = [];
  formErrors.password = [];
  formErrors.confirm_password = [];
  await axios.get('/sanctum/csrf-cookie');
  customerUtils.register(form.email, form.password, form.confirm_password, thirdPartyDeclarationAccepted.value).then(() => {
    router.push({ name: 'onboardingWorkflow' });
  }).catch((e) => {
    if (e.status === 422) {
      const errors = e.response.data.errors;
      if (typeof errors.email !== 'undefined') {
        formErrors.email = errors.email;
      }
      if (typeof errors.password !== 'undefined') {
        formErrors.password = errors.password;
      }
      if (typeof errors.confirm_password !== 'undefined') {
        formErrors.confirm_password = errors.confirm_password;
      }
    } else {
      console.error(e);
    }
  }).finally(() => {
    isLoading.value = false;
  })
}

const userAgreementUrl = import.meta.env.VITE_USER_AGREEMENT_URL;
const privacyPolicyUrl = import.meta.env.VITE_PRIVACY_POLICY_URL;
const appUrl = import.meta.env.VITE_APP_URL;

const canContinue = computed(() => {
  if (termsAccepted.value && !isLoading.value) {
    if (thirdPartyDeclaration) {
      return thirdPartyDeclarationAccepted.value;
    }
    return true;
  }
  return false;
})
</script>

<template>
  <main>
    <!-- Background Wrapper -->
    <div class="min-h-screen flex items-center justify-center bg-no-repeat bg-center bg-cover relative"
      style="background-image: url('/images/backgrounds/login.png');">
      
      <!-- Overlay -->
      <!-- <div class="absolute inset-0 bg-gradient-to-r from-green-300/70 via-teal-400/70 to-green-500/70"></div> -->

      <!-- Loader -->
      <i v-if="isLoading" class="pi pi-spin pi-spinner text-5xl text-white z-10"></i>

      <!-- Card -->
      <div v-else class="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">

        <!-- Logo -->
        <div class="text-center mb-6">
          <img src="/images/logo.png" class="h-12 md:h-16 mx-auto mb-3" />
          <p class="text-xs text-gray-400">
            Make your money transfer easy and fun!
          </p>
        </div>

        <!-- Heading -->
        <h2 class="text-xl font-semibold text-center mb-6">
          Adventure starts here
        </h2>

        <!-- Form -->
        <form @submit.prevent="register" class="space-y-4">

          <!-- Email -->
          <div>
            <label :class="[formErrors.email.length ? 'text-red-600' : 'text-gray-500']" class="text-xs block mb-1">
              EMAIL
            </label>
            <input type="email" v-model="form.email" placeholder="enter your email"
              :class="[formErrors.email.length ? 'border-red-500' : 'border-gray-200']"
              class="w-full px-4 py-3 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-teal-400 border" />
            <p v-if="formErrors.email.length" class="text-xs text-red-500 mt-1">
              {{ formErrors.email[0] }}
            </p>
          </div>

          <!-- Password -->
          <div>
            <label :class="[formErrors.password.length ? 'text-red-600' : 'text-gray-500']" class="text-xs block mb-1">
              PASSWORD
            </label>
            <div class="relative">
              <input :type="showPassword ? 'text' : 'password'" v-model="form.password" placeholder="••••••••"
                :class="[formErrors.password.length ? 'border-red-500' : 'border-gray-200']"
                class="w-full px-4 py-3 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-teal-400 border" />
              <span @click="showPassword = !showPassword" class="absolute right-3 top-3 cursor-pointer text-gray-400">
                <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
              </span>
            </div>
            <p v-if="formErrors.password.length" class="text-xs text-red-500 mt-1">
              {{ formErrors.password[0] }}
            </p>
          </div>

          <!-- Password Rules -->
          <ul class="space-y-1">
            <li v-for="validatedPasswordPolicyRule in validatedPasswordPolicies.rules">
              <div class="flex items-center gap-2 text-xs">
                <i v-if="validatedPasswordPolicyRule?.outcome === true" class="pi pi-check-circle text-emerald-500"></i>
                <i v-else-if="validatedPasswordPolicyRule?.outcome === false"
                  class="pi pi-times-circle text-red-500"></i>
                <i v-else class="pi pi-circle text-gray-400"></i>

                <span :class="[
                  validatedPasswordPolicyRule?.outcome === true
                    ? 'text-emerald-500'
                    : validatedPasswordPolicyRule?.outcome === false
                      ? 'text-red-500'
                      : 'text-gray-400'
                ]">
                  {{ validatedPasswordPolicyRule.message }}
                </span>
              </div>
            </li>
          </ul>

          <!-- Confirm Password -->
          <div>
            <label :class="[formErrors.confirm_password.length ? 'text-red-600' : 'text-gray-500']"
              class="text-xs block mb-1">
              CONFIRM PASSWORD
            </label>
            <div class="relative">
              <input :type="showConfirmPassword ? 'text' : 'password'" v-model="form.confirm_password"
                placeholder="••••••••"
                :class="[formErrors.confirm_password.length ? 'border-red-500' : 'border-gray-200']"
                class="w-full px-4 py-3 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-teal-400 border" />
              <span @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-3 cursor-pointer text-gray-400">
                <i :class="showConfirmPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
              </span>
            </div>
            <p v-if="formErrors.confirm_password.length" class="text-xs text-red-500 mt-1">
              {{ formErrors.confirm_password[0] }}
            </p>
          </div>

          <!-- Terms -->
          <div class="flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" v-model="termsAccepted" class="accent-teal-500 mt-1" />
            <label>
              I agree to
              <a :href="privacyPolicyUrl" target="_blank" class="text-teal-500 underline">privacy policy</a>
              &
              <a :href="userAgreementUrl" target="_blank" class="text-teal-500 underline">terms</a>
            </label>
          </div>

          <!-- Third Party -->
          <div v-if="thirdPartyDeclaration" class="flex items-start gap-2 text-xs text-gray-600">
            <input type="checkbox" v-model="thirdPartyDeclarationAccepted" class="accent-teal-500 mt-1" />
            <label>{{ thirdPartyDeclaration }}</label>
          </div>

          <!-- Submit Button -->
          <button :disabled="!canContinue"
            :class="[canContinue ? 'hover:bg-brand-500 transition cursor-pointer' : 'opacity-60 cursor-not-allowed']"
            type="submit"
            class="block w-full bg-brand-700 text-center py-3 font-medium text-white rounded-[10px]">Continue</button>

        </form>

        <!-- Footer -->
        <p class="text-center text-sm text-gray-500 mt-6">
          Already have an account?
          <router-link :to="{ name: 'signIn' }" class="text-teal-500 hover:underline">
            Sign in instead
          </router-link>
        </p>
      </div>
    </div>
  </main>
</template>
