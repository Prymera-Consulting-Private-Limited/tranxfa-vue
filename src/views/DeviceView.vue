<script setup>
import {failureMessage, logRequestFailure} from "@/composables/api_utils.js";
import LoadFailurePanel from "@/components/LoadFailurePanel.vue";
import CustomerLayout from "@/components/CustomerLayout.vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {computed, onMounted, ref} from "vue";
import Device from "@/models/device.js";
import CardShimmer from "@/components/CardShimmer.vue";
import DeviceCard from "@/components/DeviceCard.vue";

const customerUtils = useCustomerUtils();
const response = ref(null);
const isLoading = ref(true);
const loadFailure = ref(null);

onMounted(refreshDevices);

const devices = computed(() => {
  return response.value?.data?.data?.map((device) => Device.getInstance(device)) || [];
})

async function refreshDevices() {
  isLoading.value = true;
  loadFailure.value = null;
  try {
    response.value = await customerUtils.devices();
  } catch (e) {
    logRequestFailure(e, 'devices');
    loadFailure.value = failureMessage(e, "No hemos podido cargar los dispositivos con sesión iniciada en tu cuenta.");
  } finally {
    isLoading.value = false;
  }
}
</script>
<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl lg:max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="rounded-lg bg-white px-4 sm:px-6 lg:px-8 py-6">
          <section aria-labelledby="section-2-title">
            <h1 class="sr-only" id="section-2-title">Dispositivos</h1>
            <div class="mb-6">
              <h2 class="text-base font-semibold text-gray-900">Tus dispositivos</h2>
              <p class="mt-1 text-sm/6 text-gray-500">Consulta y administra todos los dispositivos donde tienes la sesión abierta. Puedes cerrar sesión en cualquier dispositivo que no estés usando.</p>
            </div>
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl">
              <template v-if="isLoading">
                <CardShimmer v-for="i in 3" :key="i" />
              </template>
              <template v-else-if="loadFailure">
                <LoadFailurePanel title="No hemos podido cargar tus dispositivos" :message="loadFailure" retryLabel="Reintentar" @retry="refreshDevices" class="mt-0 md:col-span-2 lg:col-span-3" />
              </template>
              <template v-else>
                <DeviceCard v-for="device in devices" :key="device.id" :device="device" @deviceDeleted="refreshDevices" />
              </template>
            </div>
          </section>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>