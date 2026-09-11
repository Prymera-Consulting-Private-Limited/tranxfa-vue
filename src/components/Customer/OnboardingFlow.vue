<script setup>
import {onMounted, watch} from "vue";
import {useMachine} from "@xstate/vue";
import {onboardingNavigationMachine} from "@/machines/onboarding_navigation_machine.js";
import {mobileAuthOnboardingMachine} from "@/machines/mobile_number_onboarding_navigation_machine.js";
import EmailVerification from "@/components/Customer/EmailVerification.vue";
import OriginCountrySelection from "@/components/Customer/OriginCountrySelection.vue";
import IdentityInformation from "@/components/Customer/IdentityInformation.vue";
import EmploymentInformation from "@/components/Customer/EmploymentInformation.vue";
import AddressInformation from "@/components/Customer/AddressInformation.vue";
import MobileNumberInput from "@/components/Customer/MobileNumberInput.vue";
import MobileNumberVerification from "@/components/Customer/MobileNumberVerification.vue";
import EmailInput from "@/components/Customer/EmailInput.vue";
import router from "@/router/index.js";
import {safeRedirect} from "@/router/guards.js";

/**
 * The machine-driven half of onboarding.
 *
 * It lives in its own component because `useMachine` runs once, at setup, and
 * on a BOTH deployment the machine cannot be chosen until the profile says
 * which way the customer signed up. The parent loads the profile first and
 * only then mounts this, so `channel` is always already resolved here.
 */
const props = defineProps({
    channel: {
        type: String,
        required: true,
        validator: (value) => ['EMAIL', 'MOBILE_NUMBER'].includes(value),
    },
});

const {snapshot, send} = useMachine(
    props.channel === 'MOBILE_NUMBER' ? mobileAuthOnboardingMachine : onboardingNavigationMachine,
);

watch(() => snapshot.value, (newSnapshot) => {
    if (newSnapshot?.value === 'onboardingComplete') {
        // Back to where the customer was heading when they had to sign in or
        // finish their details, if that was somewhere on this site.
        const redirect = safeRedirect(router.currentRoute.value.query.redirect);
        router.push(redirect ?? {name: 'dashboard'});
    }
}, {deep: true});

const proceed = () => send({type: 'PROCEED'});
const changeCountry = () => send({type: 'CHANGE_COUNTRY'});
const editMobileNumber = () => send({type: 'EDIT_MOBILE_NUMBER'});
const editPersonalInformation = () => send({type: 'EDIT_PERSONAL_INFORMATION'});

// The first PROCEED resolves how far the customer already is; the guards read
// the store, which the parent has loaded before mounting this.
onMounted(() => proceed());
</script>

<template>
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
      v-on:editPersonalInformationRequested="editPersonalInformation" />
  <MobileNumberInput
      v-else-if="snapshot?.value === 'mobileNumberInput'"
      v-on:mobileNumberUpdated="proceed"
      v-on:editPersonalInformationRequested="editPersonalInformation"
  />
  <MobileNumberVerification
      v-else-if="snapshot?.value === 'mobileNumberVerification'"
      v-on:mobileNumberVerified="proceed"
      v-on:editMobileNumberRequested="editMobileNumber"
  />
  <EmailInput
      v-else-if="snapshot?.value === 'emailInput'"
      v-on:editPersonalInformationRequested="editPersonalInformation"
      v-on:skipEmailInput="proceed"
      v-on:emailUpdated="proceed"
  />
</template>
