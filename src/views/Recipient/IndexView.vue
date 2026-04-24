<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import { useCustomerStore } from "@/stores/customer.js";
import { useCustomerUtils } from "@/composables/customer_utils.js";
import { useRecipientUtils } from "@/composables/recipient_utils.js";
import { onMounted, ref } from "vue";
import Recipient from "@/models/recipient.js";
import RecipientCard from "@/components/Recipient/RecipientCard.vue";
import RecipientCardShimmer from "@/components/Recipient/RecipientCardShimmer.vue";
import { UserPlusIcon, PlusIcon } from "@heroicons/vue/24/outline/index.js";
import AddRecipientWizard from "@/components/Recipient/AddRecipientWizard.vue";
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from "@headlessui/vue";
import router from "@/router/index.js";
import Pagination from "@/components/Pagination.vue";
import { DotLottieVue } from "@lottiefiles/dotlottie-vue";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();
const recipientUtils = useRecipientUtils();
const isLoading = ref(true);
const recipients = ref([]);
const pagination = ref(null);
const colors = [
  "pink",
  "indigo",
  "yellow",
  "green",
  "blue",
  "blue",
]

async function getRecipients(page = null) {
  const query = {
    page: page
  };
  await recipientUtils.get(query).then((response) => {
    recipients.value = response.data.data.map((recipient) => Recipient.getInstance(recipient));
    pagination.value = response.data.pagination;
    isLoading.value = false;
  });
}

onMounted(async () => {
  if (!customerStore.isLoaded) {
    customerUtils.refresh().then(() => {
      customerStore.isLoaded = true;
    });
  }
  await getRecipients();
});

const isCreateRecipientModalOpen = ref(false);
const createRecipient = () => {
  isCreateRecipientModalOpen.value = true;
};

const recipientCreated = (recipient) => {
  isCreateRecipientModalOpen.value = false;
  router.push({ name: 'viewRecipient', params: { id: recipient.id } });
};
</script>

<template>
  <CustomerLayout>
    <main class="bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <div class="mx-auto max-w-full px-4 sm:px-6 lg:px-8 pb-10   sm:pb-12">
        <h1 class="sr-only">Your Recipients</h1>
        <header
          class="relative overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
          <div
            class="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-100/60 blur-2xl sm:size-64"
            aria-hidden="true" />
          <div class="pointer-events-none absolute -bottom-20 -left-10 size-40 rounded-full bg-teal-100/40 blur-2xl"
            aria-hidden="true" />

          <div class="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
            <div class="min-w-0 max-w-2xl">
              <p class="text-xs font-semibold uppercase tracking-wide text-brand-700">
                People you send to
              </p>
              <h2 id="recipients-heading" class="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Your recipients
              </h2>
              <p class="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
                Add, review, or update the people you transfer money to. Tap a card to open full details.
              </p>
            </div>
            <div class="flex shrink-0 flex-col gap-2 sm:items-end">
              <button @click="createRecipient" type="button"
                class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-700/20 transition hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 sm:w-auto sm:px-5 sm:py-2.5">
                <PlusIcon class="size-5 shrink-0 sm:size-5" aria-hidden="true" />
                Add recipient
              </button>
              <p class="text-center text-xs text-gray-500 sm:text-right">
                Quick setup, guided steps
              </p>
            </div>
          </div>
        </header>

        <section class="mt-8 sm:mt-10" aria-labelledby="recipients-heading">
          <template v-if="isLoading">
            <ul role="list"
              class="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              <li v-for="i in 6" :key="i"
                class="min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white text-center shadow-sm ring-1 ring-gray-100">
                <RecipientCardShimmer />
              </li>
            </ul>
          </template>
          <template v-else>
            <template v-if="recipients.length > 0">
              <ul role="list"
                class="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                <li v-for="(recipient, index) in recipients" :key="recipient.id"
                  class="group min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white text-center shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-200/60">
                  <router-link :to="{ name: 'viewRecipient', params: { id: recipient.id } }"
                    class="block min-w-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
                    <RecipientCard v-bind:cardColor="colors[index % 6]" v-bind:recipient="recipient" />
                  </router-link>
                </li>
              </ul>
              <div
                class="mt-8 w-full min-w-0 rounded-2xl border border-gray-100 bg-white/80 px-3 py-4 shadow-sm sm:mt-10 sm:px-6">
                <Pagination v-bind:pagination="pagination" v-on:pageClicked="getRecipients" />
              </div>
            </template>

            <template v-else>
              <div
                class="relative overflow-hidden rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-white to-gray-50/90 px-6 py-14 text-center shadow-inner sm:px-10 sm:py-16">
                <div
                  class="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-brand-50/50 to-transparent"
                  aria-hidden="true" />
                <div class="relative mx-auto flex max-w-md flex-col items-center">
                  <div class="mb-3 flex w-full shrink-0 justify-center" role="img"
                    aria-label="Animation illustrating money transfer">
                    <DotLottieVue
                      class="mx-auto h-26 w-full max-w-[min(100%,22rem)] object-contain md:h-[14rem] md:max-w-[36rem]"
                      autoplay loop src="/animation/no-result.json" />
                  </div>
                  <h3 class="mt-6 text-lg font-semibold text-gray-900 sm:text-xl">
                    No Recipients Yet
                  </h3>
                  <p class="mt-2 text-sm leading-relaxed text-gray-600">
                    When you add someone, they will show up here as a card you can open anytime.
                  </p>
                  <button @click="createRecipient" type="button"
                    class="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-700/20 transition hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">
                    <PlusIcon class="size-5 shrink-0" aria-hidden="true" />
                    Add your first recipient
                  </button>
                </div>
              </div>
            </template>
          </template>
        </section>
      </div>
    </main>
    <TransitionRoot as="template" :show="isCreateRecipientModalOpen">
      <Dialog class="relative z-10" @close="isCreateRecipientModalOpen = false">
        <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100"
          leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild as="template" enter="ease-out duration-300"
              enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200"
              leave-from="opacity-100 translate-y-0 sm:scale-100"
              leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
              <DialogPanel
                class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <AddRecipientWizard class="p-6 sm:px-8" v-on:recipient:added="recipientCreated" />
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </CustomerLayout>
</template>