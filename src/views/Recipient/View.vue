<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import Calculator from "@/components/Calculator.vue";
import {onMounted, ref} from "vue";

import {useRecipientUtils} from "@/composables/recipient_utils.js";
import router from "@/router/index.js";
import Recipient from "@/models/recipient.js";

const recipientUtils = useRecipientUtils();
const isLoading = ref(true);
const id = router.currentRoute.value.params.id;
const recipient = ref(null);

onMounted(async () => {
  await recipientUtils.getRecipient(id).then((response) => {
    recipient.value = Recipient.getInstance(response.data);
  }).finally(() => {
    isLoading.value = false;
  })
});
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8 bg-gray-50">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">Your Recipients</h1>
        <!-- Main 3 column grid -->
        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8">
          <!-- Left column -->
          <div class="grid grid-cols-1 gap-4 lg:col-span-2">
            <section aria-labelledby="section-2-title">
              <div class="flex justify-between items-center">
                <div>
                  <h2 class="text-base font-semibold text-gray-900">{{ recipient?.fullName }}</h2>
                  <p class="mt-1 text-sm text-gray-500">
                    {{ recipient?.channel.payoutMethod.title }} in
                    {{ recipient?.channel.country.commonName }} for receiving {{ recipient?.channel.currency.isoAlpha }}

                  </p>
                </div>
              </div>
              <div  class="mt-6 border-t border-gray-200 py-6">

              </div>
            </section>
          </div>

          <!-- Right column -->
          <div class="grid grid-cols-1 gap-4" v-if="!isLoading">
            <section aria-labelledby="section-2-title">
              <h2 class="sr-only" id="section-2-title">Send Money</h2>
              <div class="rounded-lg bg-white shadow-lg p-5 pb-16">
                <Calculator
                  v-bind:recipient="recipient"
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>