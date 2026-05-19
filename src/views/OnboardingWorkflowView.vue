<script setup>
import {onMounted, ref, watch} from "vue";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useMachine} from "@xstate/vue";
import {onboardingNavigationMachine} from "@/machines/onboarding_navigation_machine.js";
import EmailVerification from "@/components/Customer/EmailVerification.vue";
import OriginCountrySelection from "@/components/Customer/OriginCountrySelection.vue";
import IdentityInformation from "@/components/Customer/IdentityInformation.vue";
import MobileNumberInput from "@/components/Customer/MobileNumberInput.vue";
import router from "@/router/index.js";
import EmploymentInformation from "@/components/Customer/EmploymentInformation.vue";

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
    isLoading.value = false;
  }
  proceed();
});

const {snapshot, send} = useMachine(onboardingNavigationMachine);

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

      <!-- Card Wrapper -->
      <div
        v-else
        class="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 md:p-10"
      >
        <!-- Logo -->
        <!-- <div class="text-center mb-6">
          <img src="/images/logo.png" class="h-8 mx-auto mb-3" />
        </div> -->


        <EmailVerification
          v-if="snapshot?.value === 'emailVerification'"
          v-on:emailVerified="proceed"
        />

        <OriginCountrySelection
          v-else-if="snapshot?.value === 'sourceCountrySelection'"
          v-on:countryUpdated="proceed"
        />

        <IdentityInformation
          v-else-if="snapshot?.value === 'identityInformation'"
          v-on:identityUpdated="proceed"
          v-on:changeCountry="changeCountry"
        />

        <EmploymentInformation
          v-else-if="snapshot?.value === 'employmentInformation'"
          v-on:employmentUpdated="proceed"
          v-on:editPersonalInformationRequested="editPersonalInformation"
        />

        <MobileNumberInput
          v-else-if="snapshot?.value === 'mobileNumberInput'"
          v-on:mobileNumberUpdated="proceed"
          v-on:editPersonalInformationRequested="editPersonalInformation"
        />
      </div>
    </div>
  </main>
</template>