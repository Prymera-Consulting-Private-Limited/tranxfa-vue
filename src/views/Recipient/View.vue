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

const recipientUtils = useRecipientUtils();
const isLoading = ref(true);
const id = router.currentRoute.value.params.id;
const recipient = ref(null);

onMounted(async () => {
  await recipientUtils.getRecipient(id).then((response) => {
    recipient.value = Recipient.getInstance(response.data);
  }).finally(() => {
    isLoading.value = false;
  })
});
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">Your Recipients</h1>
        <!-- Main 3 column grid -->
        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8 bg-white rounded-t-lg p-5">
          <!-- Left column -->
          <div class="grid grid-cols-1 gap-4 lg:col-span-2">
            <section aria-labelledby="section-2-title">
              <div class="flex justify-between items-center">
                <div v-if="isLoading">
                  <PageHeadingShimmer />
                </div>
                <div v-else>
                  <h2 class="text-base font-semibold text-gray-900">{{ recipient?.fullName }}</h2>
                  <p class="mt-1 text-sm text-gray-500">
                    {{ recipient?.channel.payoutMethod.title }} in
                    {{ recipient?.channel.country.commonName }} for receiving {{ recipient?.channel.currency.isoAlpha }}
                  </p>
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
                        <div class="text-gray-900">{{ recipient.fullName }}</div>
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
              <div class="rounded-lg bg-white shadow-lg p-5 pb-16">
                <Calculator v-bind:recipient="recipient" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>