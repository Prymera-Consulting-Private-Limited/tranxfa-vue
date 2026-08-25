<script setup>
import {computed, onMounted, reactive, ref, watch} from "vue";
import router from "@/router/index.js";
import {usePasswordPolicyStore} from "@/stores/password_policy.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {usePasswordPolicyUtils} from "@/composables/password_policy_utils.js";
import axios from "axios";

const isLoading = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const passwordFocused = ref(false);
const confirmPasswordFocused = ref(false);
const passwordRequirementsOpen = ref(false);

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
    <div class="flex items-center justify-center min-h-screen bg-gray-50 tracking-wider">
      <i v-if="isLoading" class="pi pi-spin pi-spinner text-5xl text-brand-700"></i>
      <div v-else class="relative flex flex-col md:flex-row w-full min-h-screen md:h-screen bg-white overflow-y-auto">
        <div class="relative hidden md:block md:w-[60%] md:h-full shrink-0">
          <img src="/images/backgrounds/resetpassword.png" alt="Full Size Image" class="h-full w-full object-cover">
        </div>

        <div class="absolute top-4 right-4 z-10 hidden md:block">
          <a href="javascript:" class="text-gray-400 text-3xl hover:text-gray-500 pr-5">
            <i class="pi pi-times"></i>
          </a>
        </div>

        <div class="flex shrink-0 items-center justify-between px-4 py-4 md:hidden">
          <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-h-10"></a>
          <a href="javascript:" class="text-gray-400 text-3xl hover:text-gray-500">
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
            <h2 class="text-2xl font-bold text-black mb-6">Reset Password</h2>

            <!-- Form -->
            <form @submit.prevent="resetPassword" class="space-y-5">
              <div v-if="resetPasswordFailureMessage" class="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <p class="text-sm text-red-700">{{ resetPasswordFailureMessage }}</p>
              </div>

              <!-- Password Field -->
              <div>
                <label :class="[formErrors.password.length > 0 ? 'text-red-700' : 'text-brand-700']" for="password" class="mb-2 block text-base font-medium">Choose Password</label>
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
                      <div v-if="getRuleOutcome(validatedPasswordPolicyRule) === true" class="relative flex items-center space-x-3">
                        <span class="flex size-4 items-center justify-center rounded-full bg-white ring-4 ring-white">
                          <i class="pi pi-check-circle text-emerald-500"></i>
                        </span>
                        <p class="min-w-0 text-sm text-emerald-500">{{ validatedPasswordPolicyRule.message }}</p>
                      </div>
                      <div v-else-if="form.password && getRuleOutcome(validatedPasswordPolicyRule) === false" class="relative flex items-center space-x-3">
                        <span class="flex size-4 items-center justify-center rounded-full bg-white ring-4 ring-white">
                          <i class="pi pi-times-circle text-red-500"></i>
                        </span>
                        <p class="min-w-0 text-sm text-red-500">{{ validatedPasswordPolicyRule.message }}</p>
                      </div>
                      <div v-else class="relative flex items-center space-x-3">
                        <span class="flex size-4 items-center justify-center rounded-full bg-white ring-4 ring-white">
                          <i class="pi pi-check-circle text-gray-500"></i>
                        </span>
                        <p class="min-w-0 text-sm text-gray-500">{{ validatedPasswordPolicyRule.message }}</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <!-- Confirm Password -->
              <div>
                <label :class="[formErrors.confirm_password.length > 0 ? 'text-red-700' : 'text-brand-700']" for="confirm_password" class="mb-2 block text-base font-medium">Confirm Password</label>
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

              <button
                :disabled="isLoading"
                type="submit"
                class="group relative block w-full overflow-hidden rounded-full bg-brand-700 py-3.5 text-center text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-800 hover:shadow-md active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span class="inline-flex items-center justify-center gap-2">
                  Continue
                  <i class="pi pi-arrow-right text-sm transition-transform duration-200 group-hover:translate-x-0.5"></i>
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
