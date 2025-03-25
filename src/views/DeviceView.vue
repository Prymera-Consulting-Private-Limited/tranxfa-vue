<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {computed, onMounted, ref} from "vue";
import Device from "@/models/device.js";

const customerUtils = useCustomerUtils();
const response = ref(null);
const isLoading = ref(true);

onMounted(async () => {
  response.value = await customerUtils.devices();
  isLoading.value = false;
});

const devices = computed(() => {
  return response.value?.data?.data?.map((device) => Device.getInstance(device)) || [];
})
</script>
<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl lg:max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="rounded-lg bg-white px-4 sm:px-6 lg:px-8 py-6">
          <section aria-labelledby="section-2-title">
            <h1 class="sr-only" id="section-2-title">Devices</h1>
            <div class="mb-6">
              <h2 class="text-base font-semibold text-gray-900">Devices</h2>
              <p class="mt-1 text-sm text-gray-500">Manage your personal details, security settings, and connected devices all in one place.</p>
            </div>

          </section>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>