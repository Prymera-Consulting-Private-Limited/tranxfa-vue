<script setup>
import {computed, onMounted, reactive, ref, watch} from "vue";
import router from "@/router/index.js";
import {usePasswordPolicyStore} from "@/stores/password_policy.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {usePasswordPolicyUtils} from "@/composables/password_policy_utils.js";
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

async function register() {
  isLoading.value = true;
  formErrors.email = [];
  formErrors.password = [];
  formErrors.confirm_password = [];
  await axios.get('/sanctum/csrf-cookie');
  customerUtils.register(form.email, form.password, form.confirm_password, thirdPartyDeclarationAccepted.value).then(() => {
    router.push({name: 'onboardingWorkflow'});
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

const passwordRequirementsOpen = ref(false);

function getRuleOutcome(rule) {
  const outcome = rule?.outcome;
  if (outcome && typeof outcome === 'object' && 'value' in outcome) {
    return outcome.value;
  }
  return outcome;
}

const allPasswordRulesMet = computed(() => {
  if (validatedPasswordPolicies.rules.length === 0) {
    return false;
  }
  return validatedPasswordPolicies.rules.every((rule) => getRuleOutcome(rule) === true);
});

const unmetPasswordRulesCount = computed(() => {
  return validatedPasswordPolicies.rules.filter((rule) => getRuleOutcome(rule) !== true).length;
});

const passwordRequirementsSummary = computed(() => {
  if (!form.password) {
    return 'Ver requisitos de contraseña';
  }
  if (allPasswordRulesMet.value) {
    return 'Contraseña válida';
  }
  return `${unmetPasswordRulesCount.value} requisito(s) pendiente(s)`;
});

const passwordRequirementsHeaderClass = computed(() => {
  if (!form.password) {
    return 'text-gray-700';
  }
  if (allPasswordRulesMet.value) {
    return 'text-emerald-500';
  }
  return 'text-red-500';
});

function togglePasswordRequirements() {
  passwordRequirementsOpen.value = !passwordRequirementsOpen.value;
}

watch(
  () => [form.password, allPasswordRulesMet.value],
  () => {
    if (passwordRequirementsOpen.value && allPasswordRulesMet.value) {
      passwordRequirementsOpen.value = false;
    }
  },
);
</script>

<template>
  <main>
    <div class="flex items-center justify-center min-h-screen bg-gray-50 tracking-wider">
      <i v-if="isLoading" class="pi pi-spin pi-spinner text-5xl text-brand-700"></i>
      <div v-else class="relative flex flex-col md:flex-row w-full h-screen bg-white">
        <!-- Left Section with Full Size Image -->
        <div class=" w-[60%] md:w-[60%] h-auto md:h-full">
          <!-- Top Image in Mobile View -->
          <img src="/images/backgrounds/bg.png" alt="Full Size Image" class="w-full h-90 md:h-full object-cover hidden md:block">
          <!-- Logo and Cross in Mobile View -->
          <div class="absolute top-4 left-4 md:hidden flex items-center justify-between w-full px-4">
            <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-w-64 max-h-10 mb-5"></a>
            <a :href="appUrl" class="text-gray-400 text-3xl hover:text-gray-500 pr-5">
              <i class="pi pi-times"></i>
            </a>
          </div>
          <!-- Logo at Top Left (Desktop) -->
          <!-- Cross Mark at Form Right Corner (Desktop) -->
          <div class="hidden md:block  absolute top-4 right-4">
            <a :href="appUrl" class="text-gray-400 text-3xl hover:text-gray-500 ">
              <i class="pi pi-times"></i>
            </a>
          </div>
        </div>

        <!-- Form Section -->
        <div class="flex-1 flex items-center justify-center p-4 md:p-16 pt-[100px] sm:pt-0">
          <div class="w-full max-w-xl">
            <!-- Logo at Top Left (Desktop)  -->
            <div class="hidden md:block">
              <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-w-64 max-h-10 mb-5"></a>
            </div>
            <!-- Form Header -->
            <h2 class="text-2xl font-bold text-black mb-2">
              Bienvenido a XENVIA · Envía dinero a Venezuela.
            </h2>
            <p class="text-sm text-[#B7A3C1] mb-6 ">Sencillo, seguro y rápido.</p>

            <!-- Form -->
            <form @submit.prevent="register" class="space-y-6">
              <!-- Email Field -->
              <div>
                <label :class="[formErrors.email.length > 0 ? 'text-red-700' : 'text-brand-700']" for="email" class="block mb-3 text-base">Correo electrónico</label>
                <div class="relative ">
                  <input type="email" id="email" v-model="form.email" :class="[formErrors.email.length > 0 ? 'text-red-500 border-red-500' : 'text-gray-900 border-gray-300']" placeholder="ingresa tu correo" class="w-full px-4 py-2 border rounded-lg">
                  <button type="button" class="absolute inset-y-0 right-0 top-1 flex items-center px-3">
                    <span class="pi pi-envelope w-5 h-5 text-gray-400"></span>
                  </button>
                </div>
                <p v-if="formErrors.email.length > 0" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.email[0] }}</p>
              </div>

              <!-- Password Field -->
              <div>
                <label :class="[formErrors.password.length > 0 ? 'text-red-700' : 'text-brand-700']" for="password" class="block mb-3 text-base">Contraseña</label>
                <div class="mb-3">
                  <div class="relative">
                    <input :type="showPassword ? 'text' : 'password'" id="password" v-model="form.password" :class="[formErrors.password.length > 0 ? 'text-red-500 border-red-500' : 'text-gray-900 border-gray-300']" placeholder="••••••••" class="w-full px-4 py-2 border rounded-lg">
                    <button type="button" class="absolute inset-y-0 right-0 top-1.5 flex items-center px-3 cursor-pointer">
                      <span @click="showPassword = !showPassword" v-if="showPassword" class="pi pi-eye-slash w-5 h-5 text-gray-400"></span>
                      <span @click="showPassword = !showPassword" v-else class="pi pi-eye w-5 h-5 text-gray-400"></span>
                    </button>
                  </div>
                  <p v-if="formErrors.password.length > 0" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.password[0] }}</p>
                </div>
                <div
                  v-if="validatedPasswordPolicies.rules.length"
                  class="rounded-lg border bg-gray-50"
                  :class="form.password ? (allPasswordRulesMet ? 'border-emerald-200' : 'border-red-200') : 'border-gray-200'"
                >
                  <button
                    type="button"
                    class="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm transition-colors"
                    :class="passwordRequirementsHeaderClass"
                    :aria-expanded="passwordRequirementsOpen"
                    @click="togglePasswordRequirements"
                  >
                    <span class="flex items-center gap-2">
                      <i
                        v-if="form.password"
                        class="pi text-sm"
                        :class="allPasswordRulesMet ? 'pi-check-circle' : 'pi-times-circle'"
                      />
                      {{ passwordRequirementsSummary }}
                    </span>
                    <i
                      class="pi transition-transform"
                      :class="[passwordRequirementsHeaderClass, passwordRequirementsOpen ? 'pi-chevron-up' : 'pi-chevron-down']"
                    />
                  </button>
                  <ul
                    v-show="passwordRequirementsOpen"
                    role="list"
                    class="space-y-2 border-t border-gray-200 px-3 py-2"
                  >
                    <li v-for="validatedPasswordPolicyRule in validatedPasswordPolicies.rules" :key="validatedPasswordPolicyRule.id">
                      <div class="relative">
                        <div v-if="validatedPasswordPolicyRule?.outcome === true" class="relative flex items-center space-x-3">
                          <div>
                            <span class="flex size-4 items-center justify-center rounded-full bg-white ring-4 ring-white">
                              <i class="pi pi-check-circle text-emerald-500"></i>
                            </span>
                          </div>
                          <div>
                            <p class="text-sm text-emerald-500">{{ validatedPasswordPolicyRule.message }}</p>
                          </div>
                        </div>
                        <div v-else-if="form.password && validatedPasswordPolicyRule?.outcome === false" class="relative flex items-center space-x-3">
                          <div>
                            <span class="flex size-4 items-center justify-center rounded-full bg-white ring-4 ring-white">
                              <i class="pi pi-times-circle text-red-500"></i>
                            </span>
                          </div>
                          <div>
                            <p class="text-sm text-red-500">{{ validatedPasswordPolicyRule.message }}</p>
                          </div>
                        </div>
                        <div v-else class="relative flex items-center space-x-3">
                          <div>
                            <span class="flex size-4 items-center justify-center rounded-full bg-white ring-4 ring-white">
                              <i class="pi pi-check-circle text-gray-500"></i>
                            </span>
                          </div>
                          <div>
                            <p class="text-sm text-gray-500">{{ validatedPasswordPolicyRule.message }}</p>
                          </div>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
              <!-- Confirm Password -->
              <div>
                <label :class="[formErrors.confirm_password.length > 0 ? 'text-red-700' : 'text-brand-700']" for="confirm_password" class="block mb-3 text-base">Confirmar contraseña</label>
                <div class="relative">
                  <input :type="showConfirmPassword ? 'text' : 'password'" id="confirm_password" v-model="form.confirm_password" :class="[formErrors.confirm_password.length > 0 ? 'text-red-500 border-red-500' : 'text-gray-900 border-gray-300']" placeholder="••••••••" class="w-full px-4 py-2 border rounded-lg">
                  <button type="button" class="absolute inset-y-0 right-0 top-1.5 flex items-center px-3 cursor-pointer">
                    <span @click="showConfirmPassword = !showConfirmPassword" v-if="showConfirmPassword" class="pi pi-eye-slash w-5 h-5 text-gray-400"></span>
                    <span @click="showConfirmPassword = !showConfirmPassword" v-else class="pi pi-eye w-5 h-5 text-gray-400"></span>
                  </button>
                </div>
                <p v-if="formErrors.confirm_password.length > 0" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.confirm_password[0] }}</p>
              </div>

              <!-- Checkbox -->
              <div class="flex items-start space-x-2">
                <input type="checkbox" id="terms" v-model="termsAccepted" class="mt-0.5 w-4 h-4 min-w-4 min-h-4 text-brand-700 border-gray-300 rounded focus:ring-brand-700 focus:ring-0 outline-none accent-brand-700" />
                <label for="terms" class="text-sm/6 text-gray-700 leading-snug">Acepto la <a :href="privacyPolicyUrl" target="_blank" class="text-brand-700 hover:text-brand-800 hover:underline">política de privacidad</a> y los <a :href="userAgreementUrl" target="_blank" class="text-brand-700 hover:text-brand-800 hover:underline">términos del servicio</a>.</label>
              </div>

              <!-- Checkbox -->
              <div v-if="thirdPartyDeclaration" class="flex items-start space-x-2">
                <input type="checkbox" id="third-party-declaration-accepted" v-model="thirdPartyDeclarationAccepted" class="mt-1 w-4 h-4 min-w-4 min-h-4 text-brand-700 border-gray-300 rounded focus:ring-brand-700 focus:ring-0 outline-none accent-brand-700" />
                <label for="third-party-declaration-accepted" class="text-sm/6 text-gray-700">{{ thirdPartyDeclaration }}</label>
              </div>

              <!-- Submit Button -->
              <button :disabled="!canContinue" :class="[canContinue ? 'hover:bg-brand-800 transition cursor-pointer' : 'opacity-60 cursor-not-allowed']" type="submit" class="block w-full bg-brand-700 text-center py-3 font-medium text-white rounded-[10px]">Continuar</button>
            </form>

            <p class="text-sm text-gray-500 mt-10 text-center">
              ¿Ya tienes cuenta? <router-link class="text-brand-700 hover:text-brand-700 hover:underline" :to="{name: 'signIn'}">Inicia sesión</router-link>
            </p>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
