<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import Calculator from "@/components/Calculator.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useRecipientUtils} from "@/composables/recipient_utils.js";
import {onMounted, ref} from "vue";
import Recipient from "@/models/recipient.js";
import RecipientCard from "@/components/Recipient/RecipientCard.vue";
import RecipientCardShimmer from "@/components/Recipient/RecipientCardShimmer.vue";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();
const recipientUtils = useRecipientUtils();
const isLoading = ref(true);
const recipients = ref([]);
const colors = [
  "pink",
  "indigo",
  "yellow",
  "green",
  "blue",
  "purple",
]

onMounted(async () => {
  if (! customerStore.isLoaded) {
    customerUtils.refresh().then(() => {
      customerStore.isLoaded = true;
    });
  }
  recipientUtils.get().then((response) => {
    recipients.value = response.data.data.map((recipient) => Recipient.getInstance(recipient));
    isLoading.value = false;
  });
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
              <h2 class="sr-only" id="section-2-title">Section title</h2>
              <div>
                <h2 class="text-base font-semibold text-gray-900">Your Recipients</h2>
                <p class="mt-1 text-sm text-gray-500">Here you can manage all your recipients and perform various actions such as adding, editing, or deleting recipients.</p>
              </div>
              <template v-if="isLoading">
                <ul role="list" class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 border-t border-gray-200 py-6">
                  <li v-for="i in 6" :key="i" class="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center shadow-sm">
                    <RecipientCardShimmer />
                  </li>
                </ul>
              </template>
              <template v-else>
                <ul v-if="recipients.length > 0" role="list" class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 border-t border-gray-200 py-6">
                  <li v-for="(recipient, index) in recipients" :key="recipient.id" class="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center shadow-sm">
                    <RecipientCard v-bind:cardColor="colors[index%6]" v-bind:recipient="recipient" />
                  </li>
                </ul>
              </template>
            </section>
          </div>

          <!-- Right column -->
          <div class="grid grid-cols-1 gap-4">
            <section aria-labelledby="section-2-title">
              <h2 class="sr-only" id="section-2-title">Send Money</h2>
              <div class="rounded-lg bg-white shadow-lg p-5 pb-16">
                <Calculator />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>