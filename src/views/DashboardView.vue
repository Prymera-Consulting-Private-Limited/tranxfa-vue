<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {onMounted} from "vue";
import Calculator from "@/components/Calculator.vue";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();

import {
  EnvelopeIcon,
  IdentificationIcon,
  UsersIcon,
  PaperAirplaneIcon,
  HomeIcon,
} from '@heroicons/vue/24/outline'

const items = [
  {
    title: 'Verify Email Address',
    description: 'Confirm your email to start sending money securely.',
    icon: EnvelopeIcon,
    background: 'bg-pink-500',
  },
  {
    title: 'Verify Your Identity',
    description: 'Upload your ID to comply with financial regulations.',
    icon: IdentificationIcon,
    background: 'bg-yellow-500',
  },
  {
    title: 'Add Address Details',
    description: 'Provide your address to ensure smooth transactions.',
    icon: HomeIcon,
    background: 'bg-green-500',
  },
  {
    title: 'Create a Recipient',
    description: 'Add the details of the person you want to send money to.',
    icon: UsersIcon,
    background: 'bg-blue-500',
  },
  {
    title: 'Send a Transaction',
    description: 'Initiate a secure transfer to your recipient.',
    icon: PaperAirplaneIcon,
    background: 'bg-purple-500',
  },
]


onMounted(async () => {
  if (! customerStore.isLoaded) {
    await customerUtils.refresh();
  }
});
</script>
<template>
  <CustomerLayout>
    <main class="-mt-24 py-8 bg-gray-50">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">Dashboard</h1>
        <!-- Main 3 column grid -->
        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8">
          <!-- Left column -->
          <div class="grid grid-cols-1 gap-4 lg:col-span-2">
            <section aria-labelledby="section-2-title">
              <h2 class="sr-only" id="section-2-title">Section title</h2>
              <div>
                <h2 class="text-base font-semibold text-gray-900">Welcome {{ customerStore.customer.firstName }}</h2>
                <p class="mt-1 text-sm text-gray-500">Get started by completing the following steps.</p>
                <ul role="list" class="mt-6 grid grid-cols-1 gap-6 border-t border-b border-gray-200 py-6 sm:grid-cols-2">
                  <li v-for="(item, itemIdx) in items" :key="itemIdx" class="flow-root">
                    <div class="relative -m-2 flex items-center space-x-4 rounded-xl p-2 ring-0 hover:bg-gray-50">
                      <div :class="[item.background, 'flex size-16 shrink-0 items-center justify-center rounded-lg']">
                        <component :is="item.icon" class="size-6 text-white" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 class="text-sm font-medium text-gray-900">
                          <a href="#" class="focus:outline-hidden">
                            <span class="absolute inset-0" aria-hidden="true" />
                            <span>{{ item.title }}</span>
                            <span aria-hidden="true"> &rarr;</span>
                          </a>
                        </h3>
                        <p class="mt-1 text-sm text-gray-500">{{ item.description }}</p>
                      </div>
                    </div>
                  </li>
                </ul>
                <div class="mt-4 flex">
                  <a href="#" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                    Or complete these steps later
                    <span aria-hidden="true"> &rarr;</span>
                  </a>
                </div>
              </div>
            </section>
          </div>

          <!-- Right column -->
          <div class="grid grid-cols-1 gap-4">
            <section aria-labelledby="section-2-title">
              <h2 class="sr-only" id="section-2-title">Send Money</h2>
              <div class="rounded-lg bg-white shadow-lg p-5 pb-16">
                <Calculator />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>

  </CustomerLayout>
</template>