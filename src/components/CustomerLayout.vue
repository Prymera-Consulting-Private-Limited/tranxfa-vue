<script setup>
import Footer from "@/components/Footer.vue";
import Header from "@/components/Header.vue";
import Sidebar from "@/components/Sidebar.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {onMounted, onUnmounted, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {NotificationGroup, Notification, notify} from 'notiwind';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'
import { XMarkIcon } from '@heroicons/vue/20/solid'

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();
const customer = customerStore.customer;

/* NEW STATE */
const collapsed = ref(false);
const mobileOpen = ref(false);

/* TOGGLE LOGIC */
function toggleSidebar() {
  if (window.innerWidth < 768) {
    mobileOpen.value = !mobileOpen.value;
  } else {
    collapsed.value = !collapsed.value;
  }
}

onMounted(async () => {
  if (customerStore.isLoaded === false) {
    await customerUtils.refresh();
  }

  if (customer.data?.id) {
    Echo.channel(`client-customer.${customer.data?.id}`)
      .listen('CustomerDocumentUploaded', () => {
        customerUtils.refresh();
      })
      .listen('CustomerDocumentProcessing', (e) => {
        const category = e.category;
        const document = e.document_type.toLowerCase();
        customerUtils.refresh();
        notify({
          group: 'customer',
          title: `${category} - Received`,
          text: `We have received your ${document}.`,
          type: 'info',
        }, -1)
      })
      .listen('CustomerDocumentApproved', (e) => {
        customerUtils.refresh();
        const category = e.category;
        const document = e.document_type.toLowerCase();
        notify({
          group: 'customer',
          title: `${category} - Accepted`,
          text: `Your ${document} has been accepted by our compliance team.`,
          type: 'success',
        }, -1)
      })
      .listen('CustomerDocumentRejected', (e) => {
        customerUtils.refresh();
        const category = e.category;
        const document = e.document_type.toLowerCase();
        notify({
          group: 'customer',
          title: `${category} - Rejected`,
          text: `We were unable to verify your ${document}.`,
          type: 'danger',
        }, -1)
      });
  }
})

onUnmounted(() => {
  if (customer.data?.id) {
    Echo.leaveChannel(`client-customer.${customer.data?.id}`);
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50/90">

    <!-- Sidebar -->
    <Sidebar
      :collapsed="collapsed"
      :mobileOpen="mobileOpen"
      @closeMobile="mobileOpen = false"
    />

    <!-- Main Layout -->
    <div
      :class="[
        'flex flex-col min-h-screen md:transition-[margin-left] md:duration-300 md:ease-out',
        collapsed ? 'md:ml-20' : 'md:ml-64'
      ]"
    >

      <!-- Header (CONNECTED) -->
      <Header
        :sidebar-collapsed="collapsed"
        :sidebar-mobile-open="mobileOpen"
        @toggleSidebar="toggleSidebar"
      />

      <!-- Content -->
      <main class="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <slot />
      </main>

      <Footer />

    </div>

    <!-- Notifications (unchanged) -->
    <NotificationGroup position="top" group="customer">
      <div class="fixed inset-0 flex items-start justify-end p-6 pointer-events-none">
        <div class="w-full max-w-sm pointer-events-auto">

          <Notification v-slot="{ notifications, close }">
            <div
              v-for="notification in notifications"
              :key="notification.id"
              class="flex w-full max-w-sm mx-auto mt-4 bg-white rounded-lg shadow-md"
            >
              <div class="p-4 w-full">
                <div class="flex items-start">

                  <div class="shrink-0">
                    <CheckCircleIcon v-if="notification.type === 'success'" class="size-6 text-green-400" />
                    <ExclamationTriangleIcon v-else-if="notification.type === 'danger'" class="size-6 text-red-400" />
                    <InformationCircleIcon v-else class="size-6 text-gray-400" />
                  </div>

                  <div class="ml-3 flex-1">
                    <p class="text-sm font-medium text-gray-900">{{ notification.title }}</p>
                    <p class="mt-1 text-sm text-gray-500">{{ notification.text }}</p>
                  </div>

                  <button @click="close(notification.id)" class="ml-4 text-gray-400 hover:text-gray-500">
                    <XMarkIcon class="size-5" />
                  </button>

                </div>
              </div>
            </div>
          </Notification>

        </div>
      </div>
    </NotificationGroup>

  </div>
</template>