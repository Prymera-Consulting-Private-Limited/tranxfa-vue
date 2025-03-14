<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import Calculator from "@/components/Calculator.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useRecipientUtils} from "@/composables/recipient_utils.js";
import {onMounted, ref} from "vue";
import Recipient from "@/models/recipient.js";
import RecipientCard from "@/components/Recipient/RecipientCard.vue";
import RecipientCardShimmer from "@/components/Recipient/RecipientCardShimmer.vue";
import {UserPlusIcon, PlusIcon} from "@heroicons/vue/24/outline/index.js";
import AddRecipientWizard from "@/components/Recipient/AddRecipientWizard.vue";
import {Dialog, DialogPanel, TransitionChild, TransitionRoot} from "@headlessui/vue";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();
const recipientUtils = useRecipientUtils();
const isLoading = ref(true);
const recipients = ref([]);
const colors = [
  "pink",
  "indigo",
  "yellow",
  "green",
  "blue",
  "purple",
]

onMounted(async () => {
  if (! customerStore.isLoaded) {
    customerUtils.refresh().then(() => {
      customerStore.isLoaded = true;
    });
  }
  recipientUtils.get().then((response) => {
    recipients.value = response.data.data.map((recipient) => Recipient.getInstance(recipient));
    isLoading.value = false;
  });
});

const isCreateRecipientModalOpen = ref(false);
const createRecipient = () => {
  isCreateRecipientModalOpen.value = true;
};
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8 bg-gray-50">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">Your Recipients</h1>
        <!-- Main 3 column grid -->
        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8">
          <!-- Left column -->
          <div class="grid grid-cols-1 gap-4 lg:col-span-2">
            <section aria-labelledby="section-2-title">
              <div class="flex justify-between items-center">
                <div>
                  <h2 class="text-base font-semibold text-gray-900">Your Recipients</h2>
                  <p class="mt-1 text-sm text-gray-500">Here you can manage all your recipients and perform various actions such as adding, editing, or deleting recipients.</p>
                </div>
                <button @click="createRecipient" type="button" class="inline-flex w-auto whitespace-nowrap items-center rounded-md bg-brand-700 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-brand-700/80 focus-visible:outline-0 focus-visible:outline-offset-0 cursor-pointer">
                  <PlusIcon class="mr-1.5 -ml-0.5 size-5" aria-hidden="true" />
                  Add Recipient
                </button>
              </div>
              <template v-if="isLoading">
                <ul role="list" class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 border-t border-gray-200 py-6">
                  <li v-for="i in 6" :key="i" class="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center shadow-sm">
                    <RecipientCardShimmer />
                  </li>
                </ul>
              </template>
              <template v-else>
                <ul v-if="recipients.length > 0" role="list" class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 border-t border-gray-200 py-6">
                  <li v-for="(recipient, index) in recipients" :key="recipient.id" class="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center transition-transform transform hover:scale-105 shadow-sm hover:shadow-md">
                    <router-link :to="{ name: 'viewRecipient', params: { id: recipient.id } }" class="cursor-pointer">
                      <RecipientCard v-bind:cardColor="colors[index%6]" v-bind:recipient="recipient" />
                    </router-link>
                  </li>
                </ul>
                <template v-else>
                  <div  class="mt-6 border-t border-gray-200 py-6">
                    <div class="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center focus:ring-0 focus:ring-offset-0 focus:outline-hidden">
                      <UserPlusIcon class="mx-auto size-12 text-gray-400" />
                      <span class="mt-4 block text-sm font-semibold text-gray-400">Oops! No recipients found. Let's add some!</span>
                      <div class="mt-6">
                        <button @click="createRecipient" type="button" class="inline-flex items-center rounded-md bg-brand-700 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-brand-700/80 focus-visible:outline-0 focus-visible:outline-offset-0 cursor-pointer">
                          <PlusIcon class="mr-1.5 -ml-0.5 size-5" aria-hidden="true" />
                          Recipient
                        </button>
                      </div>
                    </div>
                  </div>
                </template>
              </template>
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
    <TransitionRoot as="template" :show="isCreateRecipientModalOpen">
      <Dialog class="relative z-10" @close="isCreateRecipientModalOpen = false">
        <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
              <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <AddRecipientWizard />
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </CustomerLayout>
</template>