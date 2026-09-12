<script setup>
import Footer from "@/components/Footer.vue";
import Header from "@/components/Header.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {onMounted, onUnmounted} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useWalletStore} from "@/stores/wallet.js";
import {useWalletUtils} from "@/composables/wallet_utils.js";
import WalletAvailability from "@/enums/wallet_availability.js";
import {walletEnabled} from "@/feature_flags.js";
import ServiceStatusBanner from "@/components/ServiceStatusBanner.vue";
import {NotificationGroup, Notification, notify} from 'notiwind';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'
import { XMarkIcon } from '@heroicons/vue/20/solid'

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();
const walletStore = useWalletStore();
const walletUtils = useWalletUtils();

/**
 * @type {{data: Customer | null}}
 */
const customer = customerStore.customer;

onMounted(async () => {
  if (customerStore.isLoaded === false) {
    await customerUtils.refresh();
  }
  // The documented probe (GET /wallet/subscription answers 404 with
  // wallet_offered when the deployment has no wallet), behind the env switch.
  if (walletEnabled() && walletStore.availability === WalletAvailability.UNKNOWN) {
    walletUtils.probe();
  }
  if (customer.data?.id) {
    Echo.channel(`client-customer.${customer.data?.id}`)
        .listen('CustomerDocumentUploaded', (e) => {
          customerUtils.refresh();
        }).listen('CustomerDocumentProcessing', (e) => {
          const category = e.category;
          const document = e.document_type.toLowerCase();
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
          if (typeof window.fbq === 'function') {
            window.fbq('trackCustom', 'KYCApproved');
          }
          customerUtils.refresh();
          const category = e.category;
          const document = e.document_type.toLowerCase();
          notify(
              {
                group: 'customer',
                title: `${category} - Aceptada`,
                text: `Tu ${document} fue aceptado por nuestro equipo de cumplimiento.`,
                type: 'success',
              },
              -1,
          )
        })
        .listen('CustomerDocumentRejected', (e) => {
          customerUtils.refresh();
          const category = e.category;
          const document = e.document_type.toLowerCase();
          notify(
              {
                group: 'customer',
                title: `${category} - Rejected`,
                text: `We couldn't accept your ${document}. Open Account verification to see why and upload it again.`,
                type: 'danger',
              },
              -1,
          )
        })
        .listen('WalletBalanceChanged', () => {
          if (walletStore.isEnrolled) {
            walletUtils.getWallet().catch(() => {});
          }
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
    <ServiceStatusBanner />
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
                    <CheckCircleIcon v-if="notification.type === 'success'" class="size-6 text-success-400" aria-hidden="true" />
                    <ExclamationTriangleIcon v-else-if="notification.type === 'danger'" class="size-6 text-danger-400" aria-hidden="true" />
                    <InformationCircleIcon v-else class="size-6 text-gray-400" aria-hidden="true" />
                  </div>
                  <div class="ml-3 w-0 flex-1 pt-0.5">
                    <p class="text-sm/6 font-medium text-gray-900">{{ notification.title }}</p>
                    <p class="mt-1 text-sm/6 text-gray-500">{{ notification.text }}</p>
                  </div>
                  <div class="ml-4 flex shrink-0">
                    <button type="button" @click="close(notification.id)" class="inline-flex rounded-md bg-white text-gray-500 hover:text-gray-500 focus:ring-0 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">
                      <span class="sr-only">Cerrar</span>
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
