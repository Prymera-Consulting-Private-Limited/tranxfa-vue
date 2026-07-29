<script setup>
import {onMounted, ref, watch} from "vue";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useMachine} from "@xstate/vue";
import {onboardingNavigationMachine} from "@/machines/onboarding_navigation_machine.js";
import {mobileAuthOnboardingMachine} from "@/machines/mobile_number_onboarding_navigation_machine.js";
import EmailVerification from "@/components/Customer/EmailVerification.vue";
import OriginCountrySelection from "@/components/Customer/OriginCountrySelection.vue";
import IdentityInformation from "@/components/Customer/IdentityInformation.vue";
import MobileNumberInput from "@/components/Customer/MobileNumberInput.vue";
import router from "@/router/index.js";
import EmploymentInformation from "@/components/Customer/EmploymentInformation.vue";
import AddressInformation from "@/components/Customer/AddressInformation.vue";
import EmailInput from "@/components/Customer/EmailInput.vue";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();
const authChannel = import.meta.env.VITE_AUTH_CHANNEL ??  'EMAIL';

/**
 * @type {{data: Customer | null}}
 */
const customer = customerStore.customer;
const isLoading = ref(false);

onMounted(async () => {
  if (! customerStore.isLoaded) {
    isLoading.value = true;
    await customerUtils.refresh();
    isLoading.value = false;
  }
  proceed();
});
const machine = authChannel === 'MOBILE_NUMBER'
    ? mobileAuthOnboardingMachine
    : onboardingNavigationMachine;

const { snapshot, send } = useMachine(machine);

watch(() => snapshot.value, (newSnapshot) => {
  if (newSnapshot?.value === 'onboardingComplete') {
    router.push({name: 'dashboard'});
  }
}, { deep: true });

const changeCountry = () => {
  send({type: 'CHANGE_COUNTRY'});
}
const proceed = () => {
  send({type: 'PROCEED'});
}
const editPersonalInformation = () => {
  send({type: 'EDIT_PERSONAL_INFORMATION'});
}
</script>

<template>
  <main>
    <div class="relative flex items-center justify-center min-h-screen bg-gray-50 tracking-wider">
      <i v-if="isLoading" class="pi pi-spin pi-spinner text-5xl text-brand-700 bg-white/10"></i>
      <div v-else class="relative flex flex-col md:flex-row w-full h-screen bg-white">
        <div class="w-[60%] md:w-[60%] h-auto md:h-full">
          <img src="/images/backgrounds/signup.png" alt="Login Background" class="w-full h-90 md:h-full object-cover hidden md:block">
          <!-- Logo and Cross in Mobile View -->
          <div class="absolute top-4 left-4 md:hidden flex items-center justify-between w-full px-4">
            <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-w-64 max-h-10 mb-5"></a>
          </div>
        </div>
        <EmailVerification v-if="snapshot?.value === 'emailVerification'" v-on:emailVerified="proceed" />
        <OriginCountrySelection
            v-else-if="snapshot?.value === 'sourceCountrySelection'"
            v-on:countryUpdated="proceed" />
        <IdentityInformation
            v-else-if="snapshot?.value === 'identityInformation'"
            v-on:identityUpdated="proceed"
            v-on:changeCountry="changeCountry" />
        <EmploymentInformation
            v-else-if="snapshot?.value === 'employmentInformation'"
            v-on:employmentUpdated="proceed"
            v-on:editPersonalInformationRequested="editPersonalInformation" />
        <AddressInformation
            v-else-if="snapshot?.value === 'addressInformation'"
            v-on:addressUpdated="proceed"
            v-on:skipAddressInformation="proceed"
            v-on:editPersonalInformationRequested="editPersonalInformation" />
        <MobileNumberInput
            v-else-if="snapshot?.value === 'mobileNumberInput'"
            v-on:mobileNumberUpdated="proceed"
            v-on:editPersonalInformationRequested="editPersonalInformation"
        />
        <EmailInput
            v-else-if="snapshot?.value === 'emailInput'"
            v-on:editPersonalInformationRequested="editPersonalInformation"
            v-on:skipEmailInput="proceed"
            v-on:emailUpdated="proceed"
        />
      </div>
    </div>
  </main>
</template>