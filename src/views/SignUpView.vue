<script setup>
import {computed, onMounted, reactive, ref, watch} from "vue";
import router from "@/router/index.js";
import {usePasswordPolicyStore} from "@/stores/password_policy.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {usePasswordPolicyUtils} from "@/composables/password_policy_utils.js";
import axios from "axios";
import IsdCodeInput from "@/components/IsdCodeInput.vue";
import {useCountryUtils} from "@/composables/country_utils.js";

const authChannel = import.meta.env.VITE_AUTH_CHANNEL ??  'EMAIL';
const thirdPartyDeclaration = import.meta.env.VITE_THIRD_PARTY_SIGNUP_DECLARATION;
const thirdPartyDeclarationAccepted = ref(false);
const isLoading = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const termsAccepted = ref(false);
const form = reactive({});
const formErrors = reactive({});
if (authChannel === 'EMAIL') {
  form.email = '';
  form.password = '';
  form.confirm_password = '';
  formErrors.email = '';
  formErrors.password = '';
  formErrors.confirm_password = '';
} else if (authChannel === 'MOBILE_NUMBER') {
  form.country = '';
  form.mobile_number = '';
  formErrors.country = '';
  formErrors.mobile_number = '';
}
const passwordPolicyStore = usePasswordPolicyStore();
const passwordPolicyUtils = usePasswordPolicyUtils();
const validatedPasswordPolicies = reactive({
  rules: [],
});
const countries = ref([]);
const countryUtils = useCountryUtils();
const customerUtils = useCustomerUtils();
onMounted(async () => {
  if (authChannel === 'EMAIL') {
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
  }
  if (authChannel === 'MOBILE_NUMBER') {
    isLoading.value = true;
    await countryUtils.getSources();
    countries.value = countryUtils.sources.value;
    isLoading.value = false;
  }
})
async function register() {
  isLoading.value = true;

  await axios.get('/sanctum/csrf-cookie');
  if (authChannel === 'EMAIL') {
    formErrors.email = [];
    formErrors.password = [];
    formErrors.confirm_password = [];
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
  if (authChannel === 'MOBILE_NUMBER') {
    formErrors.mobile_number = [];
    formErrors.country = [];
    customerUtils.registerWithMobileNumber(form.country, form.mobile_number, thirdPartyDeclarationAccepted.value).then(() => {
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
      if (e.status === 422) {
        const errors = e.response.data.errors;
        if (typeof errors.country !== 'undefined') {
          formErrors.country = errors.country;
        }
        if (typeof errors.mobile_number !== 'undefined') {
          formErrors.mobile_number = errors.mobile_number;
        }
      } else {
        console.error(e);
      }
    }).finally(() => {
      isLoading.value = false;
    })
  }
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
const itemLabelGenerator = (country) => {
  return '+' + country.callingCode + ' ' + country.commonName;
}

function updateIsdCode(updated) {
  form.country = updated?.id;
}

const emailFocused = ref(false);
const passwordFocused = ref(false);
const confirmPasswordFocused = ref(false);
const mobileFocused = ref(false);

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

const totalPasswordRulesCount = computed(() => validatedPasswordPolicies.rules.length);

const passwordRequirementsSummary = computed(() => {
  if (!form.password) {
    return 'View password requirements';
  }
  if (allPasswordRulesMet.value) {
    return 'All requirements met';
  }
  return `${unmetPasswordRulesCount.value} of ${totalPasswordRulesCount.value} not met`;
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
    <div class="relative flex items-center justify-center min-h-screen bg-gray-50 tracking-wider">
      <i v-if="isLoading" class="pi pi-spin pi-spinner text-5xl text-brand-700"></i>
      <div v-else class="relative flex flex-col md:flex-row w-full min-h-screen md:h-screen bg-white overflow-y-auto">
        <div class="relative hidden md:block md:w-[60%] md:h-full shrink-0">
          <img src="/images/backgrounds/signup.webp" alt="Full Size Image" class="h-full w-full object-cover">
        </div>

        <div class="absolute top-4 right-4 z-10 hidden md:block">
          <a :href="appUrl" class="text-gray-400 text-3xl hover:text-gray-500 pr-5">
            <i class="pi pi-times"></i>
          </a>
        </div>

        <div class="flex shrink-0 items-center justify-between px-4 py-4 md:hidden">
          <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-h-10"></a>
          <a :href="appUrl" class="text-gray-400 text-3xl hover:text-gray-500">
            <i class="pi pi-times"></i>
          </a>
        </div>

        <!-- Form Section -->
        <div class="flex min-h-0 flex-1 items-start justify-center p-4 md:items-center md:p-8">
          <div class="w-full max-w-xl">
            <!-- Logo at Top Left (Desktop)  -->
            <div class="hidden md:block">
              <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-h-16 mb-5 -ml-2"></a>
            </div>
            <!-- Form Header -->
            <h2 class="text-2xl font-bold text-black mb-2">
              Adventure starts here
              <img src="/images/rocket.gif" alt="Verified" class="w-8 h-8 inline-block">
            </h2>
            <p class="text-sm text-[#B7A3C1] mb-6 ">Make your money transfer easy and Fun!</p>

            <!-- Form -->
            <form @submit.prevent="register" class="space-y-5">
              <template v-if="authChannel === 'MOBILE_NUMBER'">
                <div v-if="! isLoading" class="space-y-3">
                  <label :class="[(formErrors.mobile_number.length > 0 || formErrors.country.length > 0) ? 'text-red-700' : 'text-brand-700']" for="mobile-number" class="block mb-1 text-base font-medium">Mobile Number</label>
                  <div class="space-y-3">
                    <IsdCodeInput v-bind:countries="countries" v-bind:fetchCountries="false" :class="['min-w-36 sm:min-w-40']" v-bind:modelValue="form.country" v-bind:itemLabelGenerator="itemLabelGenerator" v-on:update:modelValue="updateIsdCode" />
                    <div
                      class="relative rounded-2xl border bg-white transition-all duration-200"
                      :class="formErrors.mobile_number.length > 0 ? 'border-red-500' : (mobileFocused ? 'border-brand-700 ring-4 ring-brand-700/10' : 'border-gray-200 hover:border-gray-300')"
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
                  <p v-if="formErrors.country.length > 0" class="mt-2 text-sm text-red-600">{{ formErrors.country[0] }}</p>
                  <p v-if="formErrors.mobile_number.length > 0" class="mt-2 text-sm text-red-600">{{ formErrors.mobile_number[0] }}</p>
                </div>
              </template>
              <template v-else-if="authChannel === 'EMAIL'">
                <!-- Email Field -->
                <div>
                  <label :class="[formErrors.email.length > 0 ? 'text-red-700' : 'text-brand-700']" for="email" class="block mb-2 text-base font-medium">Email</label>
                  <div
                    class="relative rounded-2xl border bg-white transition-all duration-200"
                    :class="formErrors.email.length > 0 ? 'border-red-500' : (emailFocused ? 'border-brand-700 ring-4 ring-brand-700/10' : 'border-gray-200 hover:border-gray-300')"
                  >
                    <input
                      type="email"
                      id="email"
                      v-model="form.email"
                      placeholder="enter your email"
                      class="w-full rounded-2xl border-0 bg-transparent py-3 pl-4 pr-12 text-gray-900 outline-none placeholder:text-gray-400"
                      @focus="emailFocused = true"
                      @blur="emailFocused = false"
                    >
                    <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                      <i class="pi pi-envelope transition-colors" :class="emailFocused ? 'text-brand-700' : 'text-gray-400'"></i>
                    </span>
                  </div>
                  <p v-if="formErrors.email.length > 0" class="mt-2 text-sm text-red-600">{{ formErrors.email[0] }}</p>
                </div>

                <!-- Password Field -->
                <div>
                  <label :class="[formErrors.password.length > 0 ? 'text-red-700' : 'text-brand-700']" for="password" class="block mb-2 text-base font-medium">Password</label>
                  <div class="mb-3">
                    <div
                      class="relative rounded-2xl border bg-white transition-all duration-200"
                      :class="formErrors.password.length > 0 ? 'border-red-500' : (passwordFocused ? 'border-brand-700 ring-4 ring-brand-700/10' : 'border-gray-200 hover:border-gray-300')"
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
                    <p v-if="formErrors.password.length > 0" class="mt-2 text-sm text-red-600">{{ formErrors.password[0] }}</p>
                  </div>
                  <div
                    v-if="validatedPasswordPolicies.rules.length"
                    class="rounded-2xl border bg-gray-50"
                    :class="form.password ? (allPasswordRulesMet ? 'border-emerald-200' : 'border-red-200') : 'border-gray-200'"
                  >
                    <button
                      type="button"
                      class="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors"
                      :class="passwordRequirementsHeaderClass"
                      :aria-expanded="passwordRequirementsOpen"
                      @click="togglePasswordRequirements"
                    >
                      <span class="flex min-w-0 items-center gap-2">
                        <i
                          v-if="form.password"
                          class="pi shrink-0 text-sm"
                          :class="allPasswordRulesMet ? 'pi-check-circle' : 'pi-times-circle'"
                        />
                        <span class="truncate">{{ passwordRequirementsSummary }}</span>
                      </span>
                      <i
                        class="pi shrink-0 transition-transform"
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
                          <div v-if="getRuleOutcome(validatedPasswordPolicyRule) === true" class="relative flex items-center space-x-3">
                            <div>
                              <span class="flex size-4 items-center justify-center rounded-full bg-white ring-4 ring-white">
                                <i class="pi pi-check-circle text-emerald-500"></i>
                              </span>
                            </div>
                            <div class="min-w-0">
                              <p class="text-sm text-emerald-500">{{ validatedPasswordPolicyRule.message }}</p>
                            </div>
                          </div>
                          <div v-else-if="form.password && getRuleOutcome(validatedPasswordPolicyRule) === false" class="relative flex items-center space-x-3">
                            <div>
                              <span class="flex size-4 items-center justify-center rounded-full bg-white ring-4 ring-white">
                                <i class="pi pi-times-circle text-red-500"></i>
                              </span>
                            </div>
                            <div class="min-w-0">
                              <p class="text-sm text-red-500">{{ validatedPasswordPolicyRule.message }}</p>
                            </div>
                          </div>
                          <div v-else class="relative flex items-center space-x-3">
                            <div>
                              <span class="flex size-4 items-center justify-center rounded-full bg-white ring-4 ring-white">
                                <i class="pi pi-check-circle text-gray-500"></i>
                              </span>
                            </div>
                            <div class="min-w-0">
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
                  <label :class="[formErrors.confirm_password.length > 0 ? 'text-red-700' : 'text-brand-700']" for="confirm_password" class="block mb-2 text-base font-medium">Confirm Password</label>
                  <div
                    class="relative rounded-2xl border bg-white transition-all duration-200"
                    :class="formErrors.confirm_password.length > 0 ? 'border-red-500' : (confirmPasswordFocused ? 'border-brand-700 ring-4 ring-brand-700/10' : 'border-gray-200 hover:border-gray-300')"
                  >
                    <input
                      :type="showConfirmPassword ? 'text' : 'password'"
                      id="confirm_password"
                      v-model="form.confirm_password"
                      placeholder="••••••••"
                      class="w-full rounded-2xl border-0 bg-transparent py-3 pl-4 pr-12 text-gray-900 outline-none placeholder:text-gray-400"
                      @focus="confirmPasswordFocused = true"
                      @blur="confirmPasswordFocused = false"
                    >
                    <button
                      type="button"
                      class="absolute inset-y-0 right-1.5 my-auto flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-brand-700 cursor-pointer"
                      :aria-label="showConfirmPassword ? 'Hide password' : 'Show password'"
                      @click="showConfirmPassword = !showConfirmPassword"
                    >
                      <i :class="showConfirmPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
                    </button>
                  </div>
                  <p v-if="formErrors.confirm_password.length > 0" class="mt-2 text-sm text-red-600">{{ formErrors.confirm_password[0] }}</p>
                </div>
              </template>

              <!-- Checkbox -->
              <label
                for="terms"
                class="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:border-brand-200 hover:bg-brand-50"
                :class="termsAccepted ? 'border-brand-200 bg-brand-50' : ''"
              >
                <input type="checkbox" id="terms" v-model="termsAccepted" class="mt-0.5 h-4 w-4 min-w-4 min-h-4 rounded border-gray-300 text-brand-700 accent-brand-700 outline-none focus:ring-0" />
                <span class="text-sm/6 text-gray-700 leading-snug">I agree to <a :href="privacyPolicyUrl" target="_blank" class="font-medium text-brand-700 hover:text-brand-800 hover:underline" @click.stop>privacy policy</a> & <a :href="userAgreementUrl" target="_blank" class="font-medium text-brand-700 hover:text-brand-800 hover:underline" @click.stop>terms of service</a>.</span>
              </label>

              <!-- Checkbox -->
              <label
                v-if="thirdPartyDeclaration"
                for="third-party-declaration-accepted"
                class="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:border-brand-200 hover:bg-brand-50"
                :class="thirdPartyDeclarationAccepted ? 'border-brand-200 bg-brand-50' : ''"
              >
                <input type="checkbox" id="third-party-declaration-accepted" v-model="thirdPartyDeclarationAccepted" class="mt-0.5 h-4 w-4 min-w-4 min-h-4 rounded border-gray-300 text-brand-700 accent-brand-700 outline-none focus:ring-0" />
                <span class="text-sm/6 text-gray-700">{{ thirdPartyDeclaration }}</span>
              </label>

              <button
                :disabled="!canContinue"
                type="submit"
                class="group relative block w-full overflow-hidden rounded-full bg-brand-700 py-3.5 text-center text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-800 hover:shadow-md active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span class="inline-flex items-center justify-center gap-2">
                  {{ authChannel === 'MOBILE_NUMBER' ? 'Get Code' : 'Continue' }}
                  <i class="pi pi-arrow-right text-sm transition-transform duration-200 group-hover:translate-x-0.5"></i>
                </span>
              </button>
            </form>

            <p class="mt-8 text-center text-sm text-gray-500">
              Already have an account?
              <router-link
                class="ml-1 inline-flex items-center rounded-full px-2 py-0.5 font-medium text-brand-700 transition-colors hover:bg-brand-50 hover:underline"
                :to="{name: 'signIn'}"
              >
                Sign in instead
              </router-link>
            </p>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
