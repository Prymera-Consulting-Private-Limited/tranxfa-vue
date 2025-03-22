<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {onMounted, reactive} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import router from "@/router/index.js";
import DocumentTypeItem from "@/components/AccountVerification/DocumentTypeItem.vue";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();

/**
 * @type {{data: Customer|null}}
 */
const customer = customerStore.customer;

const selectedCategory = reactive({
  data: null,
})

onMounted(async () => {
  if (! customerStore.isLoaded) {
    customerUtils.refresh().then(() => {
      selectedCategory.data = customer.data?.pendingDocuments?.find(category => category.id === router.currentRoute.value.params.category);
    });
  } else {
    selectedCategory.data = customer.data?.pendingDocuments?.find(category => category.id === router.currentRoute.value.params.category);
  }
});

const finalStateReached = async () => {
  await router.push({name: 'accountVerification'});
}
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8 bg-gray-50">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">Select document type for your Proof of Identity</h1>
        <!-- Main 3 column grid -->
        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8">
          <!-- Left column -->
          <div class="grid grid-cols-1 gap-4 lg:col-span-2">
            <section aria-labelledby="section-2-title">
              <h2 class="sr-only" id="section-2-title">{{ selectedCategory.data?.title }}</h2>
              <div>
                <h2 class="text-base font-semibold text-gray-900">{{ selectedCategory.data?.title }}</h2>
                <p class="mt-1 text-sm text-gray-500">Get started by completing the following steps.</p>
                <div class="mt-6 border-t border-b border-gray-200 py-6 w-full">
                  <ul v-if="selectedCategory.data?.documentTypes?.length > 0" role="list" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <li v-for="documentType in selectedCategory.data.documentTypes" :key="documentType.id" class="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center shadow-sm">
                      <DocumentTypeItem
                          v-bind:documentType="documentType"
                          v-bind:documentCategory="selectedCategory.data"
                          v-on:sdkFinalStateReached=""
                      />
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          <!-- Right column -->
          <div class="grid grid-cols-1 gap-4">

          </div>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>