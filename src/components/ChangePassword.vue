<script setup>
import {usePasswordPolicyStore} from "@/stores/password_policy.js";
import {usePasswordPolicyUtils} from "@/composables/password_policy_utils.js";
import {computed, onMounted, reactive, ref} from "vue";
import Spinner from "@/components/Spinner.vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";

const passwordPolicyStore = usePasswordPolicyStore();
const passwordPolicyUtils = usePasswordPolicyUtils();
const customerUtils = useCustomerUtils();

const showCurrentPassword = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const isLoading = ref(false);

const validatedPasswordPolicies = reactive({
  rules: [],
});

const form = reactive({
  current_password: "",
  password: "",
  confirm_password: "",
});

const formErrors = reactive({
  current_password: [],
  password: [],
  confirm_password: [],
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
});

const emit = defineEmits(["account:password:changed"]);

const changePassword = async () => {
  isLoading.value = true;
  formErrors.current_password = [];
  formErrors.password = [];
  formErrors.confirm_password = [];

  await customerUtils.changePassword(form.current_password, form.password, form.confirm_password).then(() => {
    emit("account:password:changed");
  }).catch((error) => {
    if (error.response.status === 422) {
      for (const [key, value] of Object.entries(error.response.data.errors)) {
        formErrors[key] = value;
      }
    }
  }).finally(() => {
    isLoading.value = false;
  });
}
</script>

<template>
  <template v-if="isLoading">
    <div class="h-24 w-full flex items-center justify-center">
      <Spinner :class="'size-12'" />
    </div>
  </template>
    <form v-else @submit.prevent="changePassword" class="space-y-6">
        <div>
            <label :class="[formErrors.current_password.length > 0 ? 'text-red-700' : 'text-brand-700']" for="current_password" class="block mb-3 text-base">Contraseña actual</label>
            <div class="relative ">
                <input :type="showCurrentPassword ? 'text' : 'password'" id="current_password" v-model="form.current_password" :class="[formErrors.current_password.length > 0 ? 'text-red-500 border-red-500' : 'text-gray-900 border-gray-300']" placeholder="••••••••" class="w-full px-4 py-2 border rounded-lg">
                <button type="button" class="absolute inset-y-0 right-0 top-1.5 flex items-center px-3 cursor-pointer">
                <span @click="showCurrentPassword = !showCurrentPassword" v-if="showCurrentPassword" class="pi pi-eye-slash w-5 h-5 text-gray-400"></span>
                <span @click="showCurrentPassword = !showCurrentPassword" v-else class="pi pi-eye w-5 h-5 text-gray-400"></span>
                </button>
            </div>
            <p v-if="formErrors.current_password.length > 0" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.current_password[0] }}</p>
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
        <!-- Submit Button -->
        <button :class="[isLoading ? 'opacity-60 cursor-not-allowed' : '']" type="submit" class="block w-full bg-brand-700 text-center py-2.5 font-medium text-white rounded-md hover:bg-brand-800 transition cursor-pointer">Cambiar contraseña</button>
    </form>
</template>