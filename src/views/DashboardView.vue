<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {onMounted} from "vue";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();

onMounted(async () => {
  if (! customerStore.isLoaded) {
    await customerUtils.refresh();
  }
});
</script>
<template>
  <CustomerLayout>
    <section class="flex w-full tracking-wider">
      <div class="container mx-auto ">
        <div class="">
          <div class="flex-1 p-4 md:p-6">
            <!-- Welcome Section -->
            <div class="bg-white p-4 md:p-6 shadow-sm rounded-lg">
              <h1 class="text-2xl font-semibold text-brand-700 mb-2 flex items-center">
                Welcome {{ customerStore.customer.firstName }}
              </h1>
              <p class="text-sm text-gray-500">Your account overview</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </CustomerLayout>
</template>
