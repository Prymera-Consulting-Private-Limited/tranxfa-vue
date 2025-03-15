<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {onMounted, reactive, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import router from "@/router/index.js";
import {IdentificationIcon} from "@heroicons/vue/24/outline";

import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'
import Spinner from "@/components/Spinner.vue";
import Sumsub from "@/components/AccountVerification/Provider/Sumsub.vue";
import System from "@/components/AccountVerification/Provider/System.vue";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();

/**
 * @type {{data: Customer|null}}
 */
const customer = customerStore.customer;

const selectedCategory = reactive({
  data: null,
})

onMounted(async () => {
  if (! customerStore.isLoaded) {
    customerUtils.refresh().then(() => {
      selectedCategory.data = customer.data?.pendingDocuments?.find(category => category.id === router.currentRoute.value.params.category);
    });
  } else {
    selectedCategory.data = customer.data?.pendingDocuments?.find(category => category.id === router.currentRoute.value.params.category);
  }
});

const openSdk = ref(false)
const isSdkInitialized = ref(false)
const documentType = ref(null);

async function openAccountVerificationModal (forDocumentType) {
  documentType.value = forDocumentType;
  openSdk.value = true;
}

async function sdkFinalStateReached () {
    await customerUtils.refresh();
    openSdk.value = false;
    await router.push({name: 'accountVerification'});
}
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8 bg-gray-50">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">Select document type for your Proof of Identity</h1>
        <!-- Main 3 column grid -->
        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8">
          <!-- Left column -->
          <div class="grid grid-cols-1 gap-4 lg:col-span-2">
            <section aria-labelledby="section-2-title">
              <h2 class="sr-only" id="section-2-title">{{ selectedCategory.data?.title }}</h2>
              <div>
                <h2 class="text-base font-semibold text-gray-900">{{ selectedCategory.data?.title }}</h2>
                <p class="mt-1 text-sm text-gray-500">Get started by completing the following steps.</p>
                <div class="mt-6 border-t border-b border-gray-200 py-6 w-full">
                  <ul v-if="selectedCategory.data?.documentTypes?.length > 0" role="list" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <li v-for="documentType in selectedCategory.data.documentTypes" :key="documentType.id" class="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center shadow-sm">
                      <div class="flex flex-1 flex-col p-8">
                        <IdentificationIcon class="mx-auto size-16 shrink-0 rounded-full text-purple-700" />
                        <h3 class="mt-6 text-sm font-medium text-gray-900">{{ documentType.title }}</h3>
                        <dl v-if="documentType.description" class="mt-1 flex grow flex-col justify-between">
                          <dt class="sr-only">Information</dt>
                          <dd class="mt-3 text-sm text-gray-500">
                            <p>{{ documentType.description }}</p>
                          </dd>
                          <dt class="sr-only">Start Verification</dt>
                          <dd class="mt-3 text-sm text-gray-500">
                            <a @click="openAccountVerificationModal(documentType)" href="javascript:" class="text-brand-700 font-semibold hover:underline">Start Verification</a>
                          </dd>
                        </dl>
                      </div>
                    </li>
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
  <TransitionRoot as="div" :show="openSdk">
    <Dialog class="relative z-10" @close="openSdk = false">
      <TransitionChild as="div" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
      </TransitionChild>
      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild as="div" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:w-sm sm:max-w-sm lg:max-w-md lg:w-md">
              <div v-show="! isSdkInitialized" role="status" class="p-10">
                <Spinner class="size-16 mx-auto" />
                <span class="sr-only">Loading...</span>
              </div>
              <Sumsub
                  v-if="documentType.api === 'SUMSUB'"
                  v-on:sdkInitialized="isSdkInitialized = true"
                  v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
                  v-bind:documentType="documentType"
                  v-bind:documentCategory="selectedCategory.data"
              />
              <System
                  v-if="documentType.api === 'SYSTEM'"
                  v-on:sdkInitialized="isSdkInitialized = true"
                  v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
                  v-bind:documentType="documentType"
                  v-bind:documentCategory="selectedCategory.data"
              />
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>