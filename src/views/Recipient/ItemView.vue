<script setup>
import InlineFailure from "@/components/InlineFailure.vue";
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
import {notify} from "notiwind";
import LoadFailurePanel from "@/components/LoadFailurePanel.vue";
import {failureMessage, getCustomerMessage, logRequestFailure} from "@/composables/api_utils.js";

const recipientUtils = useRecipientUtils();
const isLoading = ref(true);
const props = defineProps({
  id: String,
})
const recipient = ref(null);
const failure = ref(null);

const isConfirmDeleteModalOpen = ref(false);
const isDeleting = ref(false);
const isDeleted = ref(false);

const timeUtils = useTimeUtils();
const lastSentOn = ref(null)

const updateTimestamp = () => {
  lastSentOn.value = recipient.value?.transactionSummary?.recentTransactionAt ? timeUtils.getNiceTime(recipient.value.transactionSummary.recentTransactionAt) : null;
}

let intervalId;

onMounted(async () => {
  await recipientUtils.getRecipient(props.id).then((response) => {
    recipient.value = Recipient.getInstance(response.data);
  }).catch((error) => {
    failure.value = getCustomerMessage(error) ?? true;
  }).finally(() => {
    isLoading.value = false;
  })
  updateTimestamp();
  intervalId = setInterval(updateTimestamp, 30000);
});

const deleteFailure = ref(null);

const handleDelete = async () => {
  try {
    isDeleting.value = true;
    deleteFailure.value = null;
    await recipientUtils.deleteRecipient(props.id);
    isDeleted.value = true;
    notify({group: 'customer', title: 'Recipient removed', text: `${recipient.value?.wholeName ?? 'This recipient'} is no longer in your list.`, type: 'success'}, 6000);
    await router.replace({name: 'recipients'});
  } catch (error) {
    logRequestFailure(error, 'recipient-delete');
    deleteFailure.value = failureMessage(error, "We couldn't remove this recipient. Please try again.");
    isDeleting.value = false;
  }
};

</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">{{ $t('recipient.yourRecipients') }}</h1>
        <LoadFailurePanel
          v-if="failure"
          :title="$t('recipient.itemLoadFailure')"
          :message="typeof failure === 'string' ? failure : null"
          :backTo="{name: 'recipients'}"
          :backLabel="$t('recipient.allRecipients')"
        />
        <!-- Main 3 column grid -->
        <div v-else class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8 bg-white rounded-t-lg p-5 shadow-lg">
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
                    <p class="mt-1 text-sm/6 text-gray-500">{{ $t('recipient.methodInCountryForCurrency', {title: recipient?.channel?.payoutMethod?.title, commonName: recipient?.channel?.country?.commonName, isoAlpha: recipient?.channel?.currency?.isoAlpha}) }}</p>
                  </div>
                  <div class="flex-none mt-3">
                    <button @click="isConfirmDeleteModalOpen = true" type="button" class="ml-3 rounded-sm px-5 py-2 font-medium text-sm/6 text-white shadow-xs ring-1 ring-danger-600 ring-inset bg-danger-600 hover:bg-danger-500 cursor-pointer">{{ $t('recipient.delete') }}</button>
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
                      <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">{{ $t('recipient.name') }}</dt>
                      <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
                        <div class="text-gray-900">{{ recipient?.wholeName }}</div>
                      </dd>
                    </div>
                    <div class="py-6 sm:flex">
                      <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">{{ $t('recipient.relation') }}</dt>
                      <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
                        <div class="text-gray-900">{{ recipient?.relationship?.title }}</div>
                      </dd>
                    </div>
                    <div class="py-6 sm:flex" v-if="recipient?.email">
                      <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">{{ $t('common.email') }}</dt>
                      <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
                        <div class="text-gray-900">{{ recipient?.email }}</div>
                      </dd>
                    </div>
                    <div class="py-6 sm:flex">
                      <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">{{ $t('recipient.recentTransaction') }}</dt>
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
                            <div v-else-if="attribute.type === RecipientDataType.SUB_DELIVERY_OPTION" class="text-gray-900">
                              {{ attribute.value?.title }}
                            </div>
                            <div v-else-if="attribute.type === RecipientDataType.SELECT" class="text-gray-900">
                              {{ attribute.value?.title }}
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
              <h2 class="sr-only" id="section-2-title">{{ $t('calculator.sendMoney') }}</h2>
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
                  <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-danger-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon class="h-6 w-6 text-danger-600" aria-hidden="true" />
                  </div>
                  <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <DialogTitle as="h3" class="text-base font-semibold leading-6 text-gray-900">{{ $t('recipient.deleteRecipient') }}</DialogTitle>
                    <div class="mt-2">
                      <DialogDescription class="text-sm/6 text-gray-500">{{ $t('recipient.confirmDeleteRecipient') }}</DialogDescription>
                    </div>
                  </div>
                </div>
                <InlineFailure :message="deleteFailure" />
                <div class="mt-5 sm:mt-4 sm:flex sm:flex-row">
                  <button
                      type="button"
                      class="inline-flex w-full justify-center rounded-md bg-danger-600 px-3 py-2 text-sm/6 font-semibold text-white shadow-sm hover:bg-danger-500 sm:mr-3 sm:w-auto cursor-pointer"
                      @click="handleDelete"
                      :disabled="isDeleting"
                  >
                    {{ isDeleting ? 'Deleting...' : 'Delete' }}
                  </button>
                  <button
                      type="button"
                      class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm/6 font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto cursor-pointer"
                      @click="isConfirmDeleteModalOpen = false"
                      :disabled="isDeleting"
                  >{{ $t('recipient.cancel') }}</button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </CustomerLayout>
</template>