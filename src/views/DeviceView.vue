<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {computed, onMounted, ref} from "vue";
import Device from "@/models/device.js";
import CardShimmer from "@/components/CardShimmer.vue";
import DeviceCard from "@/components/DeviceCard.vue";
import {
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
} from "@heroicons/vue/24/outline";

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

const refreshDevices = async () => {
  response.value = await customerUtils.devices();
  isLoading.value = false;
}
</script>
<template>
  <CustomerLayout>
    <main class="relative isolate pb-14">
      <div
        class="pointer-events-none absolute inset-x-0 -top-32 flex justify-center overflow-hidden opacity-50"
        aria-hidden="true"
      >
        <div
          class="h-72 w-[42rem] -translate-x-1/4 rounded-full bg-gradient-to-tr from-brand-200/70 via-brand-100/50 to-transparent blur-3xl sm:w-[52rem]"
        />
      </div>

      <section
        aria-labelledby="section-2-title"
        class="relative mx-auto max-w-full px-4 sm:px-6 lg:px-8"
      >
        <div
          class="overflow-hidden rounded-2xl border border-gray-200/90 bg-white/90 shadow-sm ring-1 ring-gray-900/5 backdrop-blur-sm"
        >
          <div
            class="grid gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-12 lg:py-12"
          >
            <div class="min-w-0">
              <div
                class="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-800 ring-1 ring-brand-100/90"
              >
                <ShieldCheckIcon class="size-4 shrink-0 text-brand-600" aria-hidden="true" />
                Account security
              </div>
              <h1
                id="section-2-title"
                class="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
              >
                Your devices
              </h1>
              <p class="mt-3 max-w-xl text-base leading-relaxed text-gray-600">
                View and manage all devices where you're signed in. You can sign out of any device that's not currently in use.
              </p>
              <div
                v-if="!isLoading"
                class="mt-6 inline-flex items-baseline gap-2 rounded-xl bg-gray-50/90 px-4 py-2.5 ring-1 ring-gray-200/80"
              >
                <span class="text-2xl font-bold tabular-nums text-gray-900">{{ devices.length }}</span>
                <span class="text-sm text-gray-600">
                  {{ devices.length === 1 ? 'device' : 'devices' }} linked to your account
                </span>
              </div>
            </div>

            <div
              class="relative mx-auto hidden max-w-xs sm:max-w-sm lg:mx-0 lg:flex lg:max-w-none lg:justify-end"
              aria-hidden="true"
            >
              <div
                class="grid rotate-1 grid-cols-2 gap-3 rounded-2xl bg-gradient-to-br from-brand-100/90 via-white to-brand-50/80 p-4 shadow-inner ring-1 ring-brand-200/60 transition-transform duration-300 hover:rotate-0"
              >
                <div
                  class="flex flex-col items-center justify-center rounded-xl bg-white/95 py-6 px-4 shadow-sm ring-1 ring-gray-100"
                >
                  <DevicePhoneMobileIcon class="size-11 text-brand-600" />
                  <span class="mt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Mobile</span>
                </div>
                <div
                  class="-mt-2 flex flex-col items-center justify-center rounded-xl bg-white/95 py-6 px-4 shadow-md ring-1 ring-brand-100/80"
                >
                  <ComputerDesktopIcon class="size-11 text-brand-700" />
                  <span class="mt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Desktop</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-10 sm:mt-12">
          <div
            class="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3 xl:gap-8"
          >
            <template v-if="isLoading">
              <CardShimmer v-for="i in 3" :key="i" />
            </template>
            <template v-else-if="devices.length > 0">
              <DeviceCard
                v-for="device in devices"
                :key="device.id"
                :device="device"
                @deviceDeleted="refreshDevices"
              />
            </template>
            <template v-else>
              <div
                class="col-span-full flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-gray-50/90 to-white px-6 py-16 text-center shadow-sm"
              >
                <div
                  class="rounded-2xl bg-white p-4 shadow-md ring-1 ring-gray-100"
                >
                  <DevicePhoneMobileIcon class="size-10 text-brand-400" aria-hidden="true" />
                </div>
                <p class="mt-5 text-base font-semibold text-gray-900">No devices to show yet</p>
                <p class="mt-2 max-w-md text-sm leading-relaxed text-gray-500">
                  When you sign in from another browser or device, it will appear here so you can review or sign it out.
                </p>
              </div>
            </template>
          </div>
        </div>
      </section>
    </main>
  </CustomerLayout>
</template>