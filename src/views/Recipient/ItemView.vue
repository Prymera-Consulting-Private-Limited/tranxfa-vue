<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import Calculator from "@/components/Calculator.vue";
import {onMounted, ref} from "vue";

import {useRecipientUtils} from "@/composables/recipient_utils.js";
import router from "@/router/index.js";
import Recipient from "@/models/recipient.js";
import RecipientDataType from "@/enums/recipient_data_type.js";
import PageHeadingShimmer from "@/components/PageHeadingShimmer.vue";
import ItemDescriptionShimmer from "@/components/ItemDescriptionShimmer.vue";
import {useTimeUtils} from "@/composables/time_utils.js";
import {Dialog, DialogDescription, DialogPanel, DialogTitle, TransitionChild, TransitionRoot} from "@headlessui/vue";
import {ExclamationTriangleIcon} from "@heroicons/vue/24/outline/index.js";
import UpdateAttributeCollection from "@/components/Recipient/UpdateAttributeCollection.vue";
import {notify} from "notiwind";

const recipientUtils = useRecipientUtils();
const isLoading = ref(true);
const props = defineProps({
  id: String,
})
const recipient = ref(null);

const isConfirmDeleteModalOpen = ref(false);
const isDeleting = ref(false);
const isDeleted = ref(false);

const isEditModalOpen = ref(false);

const timeUtils = useTimeUtils();
const lastSentOn = ref(null)

const updateTimestamp = () => {
  lastSentOn.value = recipient.value?.transactionSummary?.recentTransactionAt ? timeUtils.getNiceTime(recipient.value.transactionSummary.recentTransactionAt) : null;
}

let intervalId;

onMounted(async () => {
  await recipientUtils.getRecipient(props.id).then((response) => {
    recipient.value = Recipient.getInstance(response.data);
  }).finally(() => {
    isLoading.value = false;
  })
  updateTimestamp();
  intervalId = setInterval(updateTimestamp, 30000);
});

const handleDelete = async () => {
  try {
    isDeleting.value = true;
    await recipientUtils.deleteRecipient(props.id);
    isDeleted.value = true;
    await router.replace({name: 'recipients'});
  } catch (error) {
    console.error('Failed to delete recipient:', error);
    isDeleting.value = false;
  }
};

const recipientUpdated = async (updatedRecipient) => {
  isEditModalOpen.value = false;
  recipient.value.attributes = updatedRecipient.attributes;
  recipient.value.relationship = updatedRecipient.relationship;
  recipient.value.name = updatedRecipient.name;
  recipient.value.secondName = updatedRecipient.secondName;
  recipient.value.thirdName = updatedRecipient.thirdName;
  recipient.value.wholeName = updatedRecipient.wholeName;
  recipient.value.updatedAt = updatedRecipient.updatedAt;
  notify(
      {
        group: 'customer',
        title: `Recipient Updated`,
        text: `Recipient information has been successfully updated.`,
        type: 'success',
      },
      -1,
  )
}

</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">Your Recipients</h1>
        <!-- Main 3 column grid -->
        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8 bg-white rounded-t-lg p-5 shadow-lg">
          <!-- Left column -->
          <div class="grid grid-cols-1 gap-4 lg:col-span-2">
            <section aria-labelledby="section-2-title">
              <div class="flex justify-between items-center">
                <div v-if="isLoading">
                  <PageHeadingShimmer />
                </div>
                <div v-else class="flex items-center justify-between w-full">
                  <div class="flex-1">
                    <h2 class="text-base font-semibold text-gray-900">{{ recipient?.wholeName }}</h2>
                    <p class="mt-1 text-sm text-gray-500">
                      {{ recipient?.channel?.payoutMethod?.title }} in
                      {{ recipient?.channel?.country?.commonName }} for receiving {{ recipient?.channel?.currency?.isoAlpha }}
                    </p>
                  </div>
                  <div class="flex-none mt-3">
                    <button @click="isEditModalOpen = true" type="button" class="rounded-sm bg-white px-5 py-2 font-medium text-sm text-gray-800 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 cursor-pointer">Edit</button>
                    <button @click="isConfirmDeleteModalOpen = true" type="button" class="ml-3 rounded-sm px-5 py-2 font-medium text-sm text-white shadow-xs ring-1 ring-red-600 ring-inset bg-red-600 hover:bg-red-500 cursor-pointer">Delete</button>
                  </div>
                </div>
              </div>
              <div class="mx-auto max-w-2xl space-y-10 lg:mx-0 lg:max-w-none">
                <div v-if="isLoading"  class="mt-6 divide-y divide-gray-100 border-t border-gray-200 text-sm/6">
                  <ItemDescriptionShimmer />
                </div>
                <div v-else>
                  <dl class="mt-6 divide-y divide-gray-100 border-t border-gray-200 text-sm/6">
                    <div class="py-6 sm:flex">
                      <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">Name</dt>
                      <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
                        <div class="text-gray-900">{{ recipient?.wholeName }}</div>
                      </dd>
                    </div>
                    <div class="py-6 sm:flex">
                      <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">Relation</dt>
                      <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
                        <div class="text-gray-900">{{ recipient.relationship?.title }}</div>
                      </dd>
                    </div>
                    <div class="py-6 sm:flex" v-if="recipient.email">
                      <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">Email</dt>
                      <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
                        <div class="text-gray-900">{{ recipient.email }}</div>
                      </dd>
                    </div>
                    <div class="py-6 sm:flex">
                      <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">Recent Transaction</dt>
                      <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
                        <div class="text-gray-900">{{ lastSentOn || 'You have not sent any transaction yet.' }}</div>
                      </dd>
                    </div>
                  </dl>
                </div>
                <div v-if="recipient?.attributes?.length > 0">
                  <h2 class="text-base/7 font-semibold text-gray-900">{{ recipient?.channel?.payoutMethod?.title }}</h2>
                  <p class="mt-1 text-sm/6 text-gray-500">{{ recipient?.channel?.payoutMethod?.description }}</p>
                  <ul role="list" class="mt-6 divide-y divide-gray-100 border-t border-gray-200 text-sm/6">
                    <template v-for="attribute in recipient.attributes" :key="attribute.attribute">
                      <li v-if="attribute.value" class="flex justify-between gap-x-6 py-6">
                        <div class="sm:flex">
                          <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">{{ attribute.label }}</dt>
                          <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
                            <div v-if="attribute.type === RecipientDataType.DELIVERY_OPTION" class="text-gray-900">
                              {{ attribute.value.title }}
                            </div>
                            <div v-else-if="attribute.type === RecipientDataType.MOBILE_NUMBER || attribute.type === RecipientDataType.PHONE_NUMBER" class="text-gray-900">
                              {{ `+${attribute.value.country.callingCode}` }} {{ attribute.value.number }}
                            </div>
                            <div v-else class="text-gray-900">
                              {{ attribute.value }}
                            </div>
                          </dd>
                        </div>
                      </li>
                    </template>
                  </ul>
                </div>
              </div>
            </section>
          </div>
          <!-- Right column -->
          <div class="grid grid-cols-1 gap-4" v-if="!isLoading">
            <section aria-labelledby="section-2-title">
              <h2 class="sr-only" id="section-2-title">Send Money</h2>
              <div class="rounded-lg bg-white p-5 pb-8 border border-dashed border-gray-300 border-1">
                <Calculator v-bind:recipient="recipient" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
    <TransitionRoot as="template" :show="isConfirmDeleteModalOpen">
      <Dialog as="div" class="relative z-10">
        <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
              <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div class="sm:flex sm:items-start">
                  <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon class="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <DialogTitle as="h3" class="text-base font-semibold leading-6 text-gray-900">Delete Recipient?</DialogTitle>
                    <div class="mt-2">
                      <DialogDescription class="text-sm text-gray-500">
                        Are you sure, you want to delete this recipient?
                      </DialogDescription>
                    </div>
                  </div>
                </div>
                <div class="mt-5 sm:mt-4 sm:flex sm:flex-row">
                  <button
                      type="button"
                      class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:mr-3 sm:w-auto cursor-pointer"
                      @click="handleDelete"
                      :disabled="isDeleting"
                  >
                    {{ isDeleting ? 'Deleting...' : 'Delete' }}
                  </button>
                  <button
                      type="button"
                      class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer"
                      @click="isConfirmDeleteModalOpen = false"
                      :disabled="isDeleting"
                  >
                    Cancel
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
    <TransitionRoot as="template" :show="isEditModalOpen">
      <Dialog class="relative z-10" @close="isEditModalOpen = false">
        <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
              <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl px-6 py-8">
                <UpdateAttributeCollection
                    v-bind:recipient="recipient"
                    v-on:recipient:updated="recipientUpdated"
                />
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </CustomerLayout>
</template>