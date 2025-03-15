<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {onMounted, ref} from "vue";
import {IdentificationIcon} from "@heroicons/vue/24/outline/index.js";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();
const isLoading = ref(false);
/**
 * @type {{data: Customer|null}}
 */
const customer = customerStore.customer;

onMounted(async () => {
  if (! customerStore.isLoaded) {
    isLoading.value = true;
    await customerUtils.refresh();
    isLoading.value = false;
  }
});
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8 bg-gray-50">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">Account Verification</h1>
        <!-- Main 3 column grid -->
        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8">
          <!-- Left column -->
          <div class="grid grid-cols-1 gap-4 lg:col-span-2">
            <section aria-labelledby="section-2-title">
              <h2 class="sr-only" id="section-2-title">Account Verification</h2>
              <div>
                <h2 class="text-base font-semibold text-gray-900">Account Verification</h2>
                <p class="mt-1 text-sm text-gray-500">Get started by completing the following steps.</p>
                <div class="mt-6 border-t border-b border-gray-200 py-6 w-full">
                  <ul v-if="customerStore.isLoaded === true" role="list" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <template v-if="customer.data?.documents.length > 0">
                      <li v-for="document in customer.data.documents" :key="document.id" class="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-green-300/20 border border-green-800 text-center shadow-sm">
                        <div class="flex flex-1 flex-col p-8">
                          <IdentificationIcon class="mx-auto size-16 shrink-0 rounded-full text-green-700" />
                          <h3 class="mt-6 text-sm font-medium text-green-900">{{ document.documentCategory.title }}</h3>
                          <dl v-if="document.documentCategory.description" class="mt-1 flex grow flex-col justify-between">
                            <dt class="sr-only">Information</dt>
                            <dd class="mt-3 text-sm text-green-800">
                              <p>{{ document.documentCategory.description }}</p>
                            </dd>
                            <dt class="sr-only">Verified</dt>
                            <dd class="mt-3 text-sm text-gray-500">
                              <a class="text-green-800 font-semibold hover:underline">Verified</a>
                            </dd>
                          </dl>
                        </div>
                      </li>
                    </template>
                    <template  v-if="customer.data?.pendingDocuments.length > 0">
                      <li v-for="pendingCategory in customer.data?.pendingDocuments" :key="pendingCategory.id" class="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center shadow-sm">
                        <div class="flex flex-1 flex-col p-8">
                          <IdentificationIcon class="mx-auto size-16 shrink-0 rounded-full text-purple-700" />
                          <h3 class="mt-6 text-sm font-medium text-gray-900">{{ pendingCategory.title }}</h3>
                          <dl v-if="pendingCategory.description" class="mt-1 flex grow flex-col justify-between">
                            <dt class="sr-only">Information</dt>
                            <dd class="mt-3 text-sm text-gray-500">
                              <p>{{ pendingCategory.description }}</p>
                            </dd>
                            <dt class="sr-only">Start Verification</dt>
                            <dd class="mt-3 text-sm text-gray-500">
                              <router-link :to="{name: 'categoryView', params: {category: pendingCategory.id}}" class="text-brand-700 font-semibold hover:underline">Start Verification</router-link>
                            </dd>
                          </dl>
                        </div>
                      </li>
                    </template>
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