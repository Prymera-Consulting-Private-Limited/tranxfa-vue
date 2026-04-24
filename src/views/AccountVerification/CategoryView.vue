<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {onMounted, reactive} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import router from "@/router/index.js";
import DocumentTypeItem from "@/components/AccountVerification/DocumentTypeItem.vue";
import CategoryDescription from "@/components/AccountVerification/CategoryDescription.vue";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();

const props = defineProps({
  id: {
    type: String,
    required: true,
  }
})

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
      selectedCategory.data = customer.data?.pendingDocuments?.find(category => category.id === props.id);
    });
  } else {
    selectedCategory.data = customer.data?.pendingDocuments?.find(category => category.id === props.id);
  }
});

const finalStateReached = async () => {
  await customerUtils.refresh();
  if (router.currentRoute.value.query._utm === 'dashboard-todos') {
    return router.push({ name: 'dashboard' });
  }
  return router.push({ name: 'accountVerification' });
}
</script>

<template>
  <CustomerLayout>
    <main class="relative bg-gray-50 ">
      <div class="mx-auto max-w-full  sm:px-6 lg:px-8">
        <h1 class="sr-only">Select document type for your {{ selectedCategory.data?.title }}</h1>

        <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
          <div class="lg:col-span-2">
            <section
              aria-labelledby="section-2-title"
              class="relative overflow-hidden rounded-3xl border border-gray-200/90 bg-white shadow-sm ring-1 ring-gray-900/[0.04]"
            >
              <div
                class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_45%_at_80%_-10%,rgba(99,102,241,0.12),transparent)]"
                aria-hidden="true"
              />
              <div
                class="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-brand-400/[0.09] blur-3xl"
                aria-hidden="true"
              />

              <div class="relative px-5 py-8 sm:px-8 sm:py-10">
                <h2 class="sr-only" id="section-2-title">{{ selectedCategory.data?.title }}</h2>

                <header class="mb-8 max-w-2xl">
                  <p
                    class="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-800"
                  >
                    <span class="h-1.5 w-1.5 rounded-full bg-indigo-500" aria-hidden="true" />
                    Choose a document
                  </p>
                  <h2 class="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                    {{ selectedCategory.data?.title }}
                  </h2>
                  <div class="mt-3" v-if="selectedCategory.data">
                    <CategoryDescription v-bind:category="selectedCategory.data" />
                  </div>
                  <p v-else class="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
                    Get started by completing the following steps.
                  </p>
                </header>

                <div class="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 sm:p-5">
                  <template v-if="customerStore.isLoaded">
                    <ul
                      v-if="selectedCategory.data?.documentTypes?.length > 0"
                      role="list"
                      class="grid grid-cols-1 gap-5 sm:grid-cols-1 sm:gap-6 lg:grid-cols-1 xl:grid-cols-2 lg:gap-6"
                    >
                      <li
                        v-for="documentType in selectedCategory.data.documentTypes"
                        :key="documentType.id"
                        class="group relative col-span-1 flex flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-gradient-to-b from-white to-gray-50/70 text-center shadow-sm ring-1 ring-black/[0.03] transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
                      >
                        <div
                          class="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-400/10 opacity-0 blur-2xl transition duration-500 group-hover:opacity-100"
                          aria-hidden="true"
                        />
                        <DocumentTypeItem
                          v-bind:documentType="documentType"
                          v-bind:documentCategory="selectedCategory.data"
                          v-on:sdkFinalStateReached="finalStateReached"
                        />
                      </li>
                    </ul>
                  </template>
                  <ul v-else role="list" class="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                    <template v-for="i in 3" :key="i">
                      <li
                        class="col-span-1 flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white text-center shadow-sm animate-pulse"
                      >
                        <div class="flex flex-1 flex-col p-6 sm:p-7">
                          <div class="mx-auto size-14 shrink-0 rounded-2xl bg-gray-200 sm:size-16"></div>
                          <div class="mx-auto mt-6 h-4 w-3/4 rounded-md bg-gray-200 sm:mt-7"></div>
                          <div class="mx-auto mt-3 h-3 w-1/2 rounded-md bg-gray-200"></div>
                          <div class="mx-auto mt-3 h-3 w-2/3 rounded-md bg-gray-200"></div>
                          <div class="mx-auto mt-5 h-10 w-2/3 rounded-full bg-gray-200"></div>
                        </div>
                      </li>
                    </template>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          <aside class="lg:col-span-1" aria-label="Document tips">
            <div
              class="sticky top-24 space-y-4 rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm ring-1 ring-gray-900/[0.03] sm:p-6"
            >
              <h3 class="text-sm font-semibold text-gray-900">Before you upload</h3>
              <p class="text-sm leading-relaxed text-gray-600">
                Pick the document type that matches what you have in hand—driver licence, passport, or other ID as
                listed.
              </p>
              <ul class="space-y-3 text-sm text-gray-600">
                <li class="flex gap-2">
                  <span
                    class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
                  >✓</span>
                  <span>Match the name on your Payvel profile.</span>
                </li>
                <li class="flex gap-2">
                  <span
                    class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
                  >✓</span>
                  <span>Photos should be sharp, in color, and fully visible.</span>
                </li>
                <li class="flex gap-2">
                  <span
                    class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
                  >✓</span>
                  <span>Follow the on-screen capture flow until it confirms completion.</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>