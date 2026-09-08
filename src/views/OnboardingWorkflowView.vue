<script setup>
import BrandLogo from "@/components/BrandLogo.vue";
import {computed, onMounted, ref} from "vue";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {resolveOnboardingChannel} from "@/onboarding_config.js";
import OnboardingFlow from "@/components/Customer/OnboardingFlow.vue";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();

/**
 * @type {{data: Customer | null}}
 */
const customer = customerStore.customer;
const isLoading = ref(false);
const loadFailed = ref(false);

// On a BOTH deployment the flow depends on how this customer signed up, so the
// profile has to be in hand before the machine is chosen. OnboardingFlow calls
// useMachine at its own setup, which is why it is mounted only once ready
// rather than being handed a channel that could still change.
const isReady = computed(() => ! isLoading.value && customerStore.isLoaded);
const channel = computed(() => resolveOnboardingChannel(customer.data));

async function loadProfile() {
  if (customerStore.isLoaded) {
    return;
  }
  isLoading.value = true;
  loadFailed.value = false;
  // .catch, not .finally: finally re-throws, which left onMounted rejecting
  // unhandled whenever the profile could not be fetched. A 401 is already
  // handled by the axios interceptor, so what reaches here is a 5xx or a dead
  // connection - worth showing rather than spinning forever.
  await customerUtils.refresh().catch((e) => {
    loadFailed.value = true;
    console.error(e);
  }).finally(() => {
    isLoading.value = false;
  });
}

onMounted(loadProfile);
</script>

<template>
  <main>
    <div class="relative flex items-center justify-center min-h-screen bg-gray-50 tracking-wider">
      <div v-if="loadFailed" class="text-center px-6">
        <p class="text-lg font-semibold text-gray-900 mb-2">We could not load your details</p>
        <p class="text-sm/6 text-gray-500 mb-6">Please check your connection and try again.</p>
        <button @click="loadProfile" type="button" class="rounded-xl bg-brand-700 px-6 py-2.5 text-sm/6 font-semibold text-white hover:bg-brand-800 cursor-pointer">Try again</button>
      </div>
      <i v-else-if="! isReady" class="pi pi-spin pi-spinner text-5xl text-brand-700 bg-white/10"></i>
      <div v-else class="relative flex flex-col md:flex-row w-full h-screen bg-white">
        <div class="w-[60%] md:w-[60%] h-auto md:h-full">
          <img src="/images/backgrounds/signup.webp" alt="Login Background" class="w-full h-90 md:h-full object-cover hidden md:block">
          <!-- Logo and Cross in Mobile View -->
          <div class="absolute top-4 left-4 md:hidden flex items-center justify-between w-full px-4">
            <a href="javascript:"><BrandLogo class="mb-5" /></a>
          </div>
        </div>
        <OnboardingFlow v-bind:channel="channel" />
      </div>
    </div>
  </main>
</template>
