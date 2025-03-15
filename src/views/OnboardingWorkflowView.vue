<script setup>
import {onMounted, ref, watch, watchEffect} from "vue";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useMachine} from "@xstate/vue";
import {onboardingNavigationMachine} from "@/machines/onboarding_navigation_machine.js";
import EmailVerification from "@/components/Customer/EmailVerification.vue";
import OriginCountrySelection from "@/components/Customer/OriginCountrySelection.vue";
import IdentityInformation from "@/components/Customer/IdentityInformation.vue";
import MobileNumberInput from "@/components/Customer/MobileNumberInput.vue";
import router from "@/router/index.js";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();

/**
 * @type {{data: Customer | null}}
 */
const customer = customerStore.customer;
const isLoading = ref(false);

onMounted(async () => {
  if (! customerStore.isLoaded) {
    isLoading.value = true;
    await customerUtils.refresh();
    send({type: 'CUSTOMER_UPDATED'});
    isLoading.value = false;
  }
});

const {snapshot, send} = useMachine(onboardingNavigationMachine);

watch(() => snapshot.value, (newSnapshot) => {
  if (newSnapshot?.value === 'onboardingComplete') {
    router.push({name: 'dashboard'});
  }
}, { deep: true });

watch(customer, () => {
  send({type: 'CUSTOMER_UPDATED'});
});
</script>

<template>
  <main>
    <div class="relative flex items-center justify-center min-h-screen bg-gray-50 tracking-wider">
      <i v-if="isLoading" class="pi pi-spin pi-spinner text-5xl text-brand-700 bg-white/10"></i>
      <div v-else class="relative flex flex-col md:flex-row w-full h-screen bg-white">
        <div class="w-[60%] md:w-[60%] h-auto md:h-full">
          <img src="/images/backgrounds/login.png" alt="Login Background" class="w-full h-90 md:h-full object-cover hidden md:block">
          <!-- Logo and Cross in Mobile View -->
          <div class="absolute top-4 left-4 md:hidden flex items-center justify-between w-full px-4">
            <a href="javascript:"><img src="/images/logo.png" alt="Tranxfa Logo" class="w-auto max-w-sm"></a>
          </div>
        </div>
        <EmailVerification v-if="snapshot?.value === 'emailVerification'" />
        <OriginCountrySelection v-else-if="snapshot?.value === 'sourceCountrySelection'" />
        <IdentityInformation v-else-if="snapshot?.value === 'identityInformation'" />
        <MobileNumberInput v-else-if="snapshot?.value === 'mobileNumberInput'" />
        <template v-else><pre>{{ snapshot }}</pre></template>
      </div>
    </div>
  </main>
</template>