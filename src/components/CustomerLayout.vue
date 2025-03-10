<script setup>
import Footer from "@/components/Footer.vue";
import Header from "@/components/Header.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {onMounted} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();

onMounted(async () => {
  if (customerStore.isLoaded === false) {
    await customerUtils.refresh();
  }
  Echo.channel(`customer.${customerStore.customer.id}`)
      .listen('CustomerDocumentProcessing', (e) => {
        console.log(e);
      })
      .listen('CustomerDocumentReviewRequired', (e) => {
        console.log(e);
      })
      .listen('CustomerDocumentApproved', (e) => {
        console.log(e);
      })
      .listen('CustomerDocumentRejected', (e) => {
        console.log(e);
      });
})
</script>

<template>
  <div class="min-h-full">
    <Header />
    <slot />
    <Footer />
  </div>
</template>
