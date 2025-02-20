<script setup>
import {computed, onMounted, reactive, ref} from "vue";
import router from "@/router/index.js";
import {usePasswordPolicyStore} from "@/stores/password_policy.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {usePasswordPolicyUtils} from "@/composables/password_policy_utils.js";

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
  await customerUtils.register(form.email, form.password, form.confirm_password).then(() => {
    router.push('/email-verification');
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
    }
    console.error(e);
  }).finally(() => {
    isLoading.value = false;
  })
}
</script>

<template>
  <main>
    <div class="flex items-center justify-center min-h-screen bg-gray-50 tracking-wider">
      <i v-if="isLoading" class="pi pi-spin pi-spinner text-5xl text-purple-700"></i>
      <div v-else class="relative flex flex-col md:flex-row w-full h-screen bg-white">
        <!-- Left Section with Full Size Image -->
        <div class=" w-[60%] md:w-[60%] h-auto md:h-full">
          <!-- Top Image in Mobile View -->
          <img src="/images/backgrounds/signup.png" alt="Full Size Image" class="w-full h-90 md:h-full object-cover hidden md:block">
          <!-- Logo and Cross in Mobile View -->
          <div class="absolute top-4 left-4 md:hidden flex items-center justify-between w-full px-4">
            <a href="javascript:"><img src="/images/logo.png" alt="Tranxfa" class="w-auto max-w-sm"></a>
            <a href="javascript:" class="text-gray-400 text-3xl hover:text-gray-500 pr-5">
              <i class="pi pi-times"></i>
            </a>
          </div>
          <!-- Logo at Top Left (Desktop) -->
          <!-- Cross Mark at Form Right Corner (Desktop) -->
          <div class="hidden md:block  absolute top-4 right-4">
            <a href="javascript:" class="text-gray-400 text-3xl hover:text-gray-500 ">
              <i class="pi pi-times"></i>
            </a>
          </div>
        </div>

        <!-- Form Section -->
        <div class="flex-1 flex items-center justify-center p-4 md:p-16 pt-[100px] sm:pt-0">
          <div class="w-full max-w-xl">
            <!-- Logo at Top Left (Desktop)  -->
            <div class="hidden md:block">
              <a href="javascript:"><img src="/images/logo.png" alt="Tranxfa" class="w-auto max-w-sm"></a>
            </div>
            <!-- Form Header -->
            <h2 class="text-2xl font-bold text-black mb-2">
              Adventure starts here
              <img src="/images/rocket.gif" alt="Verified" class="w-8 h-8 inline-block">
            </h2>
            <p class="text-sm text-[#B7A3C1] mb-6 ">Make your money transfer easy and Fun!</p>

            <!-- Form -->
            <form @submit.prevent="register" class="space-y-6">
              <!-- Email Field -->
              <div>
                <label :class="[formErrors.email.length > 0 ? 'text-red-700' : 'text-purple-700']" for="email" class="block mb-3 text-base">Email</label>
                <div class="relative ">
                  <input type="email" id="email" v-model="form.email" :class="[formErrors.email.length > 0 ? 'text-red-500 border-red-500' : 'text-gray-900 border-gray-300']" placeholder="enter your email" class="w-full px-4 py-2 border rounded-lg">
                  <button type="button" class="absolute inset-y-0 right-0 top-1 flex items-center px-3">
                    <span class="pi pi-envelope w-5 h-5 text-gray-400"></span>
                  </button>
                </div>
                <p v-if="formErrors.email.length > 0" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.email[0] }}</p>
              </div>

              <!-- Password Field -->
              <div>
                <label :class="[formErrors.password.length > 0 ? 'text-red-700' : 'text-purple-700']" for="password" class="block mb-3 text-base">Password</label>
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
              </div>
              <ul role="list" class="space-y-2">
                <li v-for="validatedPasswordPolicyRule in validatedPasswordPolicies.rules">
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
                    <div v-else-if="(validatedPasswordPolicyRule?.outcome || true) === false" class="relative flex items-center space-x-3">
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
              <!-- Confirm Password -->
              <div>
                <label :class="[formErrors.confirm_password.length > 0 ? 'text-red-700' : 'text-purple-700']" for="confirm_password" class="block mb-3 text-base">Confirm Password</label>
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
              <div class="flex items-center space-x-2">
                <input type="checkbox" id="terms" v-model="termsAccepted" class="w-4 h-4 text-purple-700 border-gray-300 rounded focus:ring-purple-700 focus:ring-0 outline-none accent-purple-700" />
                <label for="terms" class="text-sm text-gray-700">I agree to <a href="#" class="text-purple-700 hover:text-purple-800 hover:underline">privacy policy & terms of service.</a></label>
              </div>

              <!-- Submit Button -->
              <button :disabled="!termsAccepted" :class="[termsAccepted ? 'hover:bg-purple-800 transition cursor-pointer' : 'opacity-60 cursor-not-allowed']" type="submit" class="block w-full bg-purple-700 text-center py-3 font-medium text-white rounded-[10px]">Continue</button>
            </form>

            <p class="text-sm text-gray-500 mt-10 text-center">
              Already have an account? <router-link class="text-purple-700 hover:text-purple-800 hover:underline" :to="'/'">Sign in instead</router-link>
            </p>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
