<script setup>
import Footer from "@/components/Footer.vue";
import Header from "@/components/Header.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {onMounted, onUnmounted} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {NotificationGroup, Notification, notify} from 'notiwind';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'
import { XMarkIcon } from '@heroicons/vue/20/solid'

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();

/**
 * @type {{data: Customer | null}}
 */
const customer = customerStore.customer;

onMounted(async () => {
  if (customerStore.isLoaded === false) {
    await customerUtils.refresh();
  }
  if (customer.data?.id) {
    Echo.channel(`client-customer.${customer.data?.id}`)
        .listen('CustomerDocumentProcessing', (e) => {
          customerUtils.refresh();
          notify(
              {
                group: 'customer',
                title: `${category} - Received`,
                text: `We have received your ${document}.`,
                type: 'info',
              },
              -1,
          )
        })
        .listen('CustomerDocumentApproved', (e) => {
          customerUtils.refresh();
          const category = 'Proof of Identity';
          const document = 'Passport'.toLowerCase();
          notify(
              {
                group: 'customer',
                title: `${category} - Accepted`,
                text: `Your ${document} has been accepted by our compliance team.`,
                type: 'success',
              },
              -1,
          )
        })
        .listen('CustomerDocumentRejected', (e) => {
          customerUtils.refresh();
          const category = 'Proof of Address';
          const document = 'Utility Bill'.toLowerCase();
          notify(
              {
                group: 'customer',
                title: `${category} - Rejected`,
                text: `We were unable to verify your ${document}.`,
                type: 'danger',
              },
              -1,
          )
        });
  }
})

onUnmounted(async () => {
  if (customer.data?.id) {
    Echo.leaveChannel(`client-customer.${customer.data?.id}`);
  }
})
</script>

<template>
  <div class="min-h-full">
    <Header />
      <slot />
    <Footer />
    <NotificationGroup position="top" group="customer">
      <div class="fixed inset-0 flex items-start justify-end p-6 px-4 py-6 pointer-events-none">
        <div class="w-full max-w-sm pointer-events-auto">
          <Notification
              v-slot="{ notifications, close }"
              enter="transform ease-out duration-300 transition"
              enter-from="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-4"
              enter-to="translate-y-0 opacity-100 sm:translate-x-0"
              leave="transition ease-in duration-500"
              leave-from="opacity-100"
              leave-to="opacity-0"
              move="transition duration-500"
              move-delay="delay-300">
            <div class="flex w-full max-w-sm mx-auto mt-4 overflow-hidden bg-white rounded-lg shadow-md" v-for="notification in notifications" :key="notification.id">
              <div class="p-4 w-full">
                <div class="flex items-start">
                  <div class="shrink-0">
                    <CheckCircleIcon v-if="notification.type === 'success'" class="size-6 text-green-400" aria-hidden="true" />
                    <ExclamationTriangleIcon v-else-if="notification.type === 'danger'" class="size-6 text-red-400" aria-hidden="true" />
                    <InformationCircleIcon v-else class="size-6 text-gray-400" aria-hidden="true" />
                  </div>
                  <div class="ml-3 w-0 flex-1 pt-0.5">
                    <p class="text-sm font-medium text-gray-900">{{ notification.title }}</p>
                    <p class="mt-1 text-sm text-gray-500">{{ notification.text }}</p>
                  </div>
                  <div class="ml-4 flex shrink-0">
                    <button type="button" @click="close(notification.id)" class="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:ring-0 focus:outline-hidden">
                      <span class="sr-only">Close</span>
                      <XMarkIcon class="size-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Notification>
        </div>
      </div>
    </NotificationGroup>
  </div>
</template>
