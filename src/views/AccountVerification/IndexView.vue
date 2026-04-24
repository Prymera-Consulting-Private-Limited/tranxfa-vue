<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {onMounted, ref} from "vue";
import {IdentificationIcon} from "@heroicons/vue/24/outline/index.js";
import KycDocumentStatus from "@/enums/kyc_document_status.js";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();
const isLoading = ref(false);
/**
 * @type {{data: Customer|null}}
 */
const customer = customerStore.customer;

onMounted(async () => {
  if (! customerStore.isLoaded) {
    isLoading.value = true;
    await customerUtils.refresh();
    isLoading.value = false;
  }
});
</script>

<template>
  <CustomerLayout>
    <main class="relative bg-gray-50">
      <div class="mx-auto max-w-full  sm:px-6 lg:px-8">
        <h1 class="sr-only">Account Verification</h1>

        <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
          <div class="lg:col-span-2">
            <section
              aria-labelledby="section-2-title"
              class="relative overflow-hidden rounded-3xl border border-gray-200/90 bg-white shadow-sm ring-1 ring-gray-900/[0.04]"
            >
              <div
                class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_50%_at_50%_-20%,rgba(20,184,166,0.12),transparent)]"
                aria-hidden="true"
              />
              <div
                class="pointer-events-none absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-brand-400/[0.1] blur-3xl"
                aria-hidden="true"
              />

              <div class="relative px-5 py-8 sm:px-8 sm:py-10">
                <h2 class="sr-only" id="section-2-title">Account Verification</h2>

                <header class="mb-8 max-w-2xl">
                  <p
                    class="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-800"
                  >
                    <span class="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
                    Compliance
                  </p>
                  <h2 class="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                    One-time
                    <span
                      class="bg-gradient-to-r from-brand-600 via-teal-600 to-brand-500 bg-clip-text text-transparent"
                    >
                      verification
                    </span>
                  </h2>
                  <p class="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
                    To keep your account secure and compliant, we just need to verify a few details.
                    <span class="mt-1 block text-gray-500">
                      This is a quick, one-time process—please follow the steps below to continue.
                    </span>
                  </p>
                </header>

                <div class="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 sm:p-5">
                  <ul
                    v-if="customerStore.isLoaded === true"
                    role="list"
                    class="grid grid-cols-1 gap-5 sm:grid-cols-1 xl:grid-cols-2 sm:gap-6  lg:gap-6"
                  >
                    <template v-if="customer.data?.documents.length > 0">
                      <template v-for="document in customer.data.documents" :key="document.id">
                        <li
                          :class="{
                            'border-emerald-300/90 bg-gradient-to-b from-emerald-50/80 to-white hover:border-emerald-400':
                              document.statusCode === KycDocumentStatus.APPROVED,
                            'border-blue-300/90 bg-gradient-to-b from-blue-50/70 to-white hover:border-blue-400':
                              document.statusCode === KycDocumentStatus.PENDING_VERIFICATION ||
                              document.statusCode === KycDocumentStatus.PROCESSING ||
                              document.statusCode === KycDocumentStatus.REVIEW_REQUIRED,
                            'border-red-300/90 bg-gradient-to-b from-red-50/70 to-white hover:border-red-400':
                              document.statusCode === KycDocumentStatus.REJECTED
                          }"
                          class="group relative col-span-1 flex flex-col overflow-hidden rounded-2xl border text-center shadow-sm ring-1 ring-black/[0.03] transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <div
                            class="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-2xl transition duration-500 group-hover:opacity-70"
                            :class="{
                              'bg-emerald-400/30': document.statusCode === KycDocumentStatus.APPROVED,
                              'bg-blue-400/30':
                                document.statusCode === KycDocumentStatus.PENDING_VERIFICATION ||
                                document.statusCode === KycDocumentStatus.PROCESSING ||
                                document.statusCode === KycDocumentStatus.REVIEW_REQUIRED,
                              'bg-red-400/30': document.statusCode === KycDocumentStatus.REJECTED
                            }"
                            aria-hidden="true"
                          />
                          <div class="relative flex flex-1 flex-col p-6 sm:p-7">
                            <div
                              class="mx-auto inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-black/[0.04] transition duration-300 group-hover:scale-[1.04] group-hover:shadow-md sm:size-16"
                            >
                              <IdentificationIcon
                                :class="{
                                  'text-emerald-700': document.statusCode === KycDocumentStatus.APPROVED,
                                  'text-blue-700':
                                    document.statusCode === KycDocumentStatus.PENDING_VERIFICATION ||
                                    document.statusCode === KycDocumentStatus.PROCESSING ||
                                    document.statusCode === KycDocumentStatus.REVIEW_REQUIRED,
                                  'text-red-700': document.statusCode === KycDocumentStatus.REJECTED
                                }"
                                class="size-8 sm:size-9"
                              />
                            </div>
                            <h3
                              :class="{
                                'text-emerald-800': document.statusCode === KycDocumentStatus.APPROVED,
                                'text-blue-800':
                                  document.statusCode === KycDocumentStatus.PENDING_VERIFICATION ||
                                  document.statusCode === KycDocumentStatus.PROCESSING ||
                                  document.statusCode === KycDocumentStatus.REVIEW_REQUIRED,
                                'text-red-800': document.statusCode === KycDocumentStatus.REJECTED
                              }"
                              class="mt-5 text-sm font-semibold sm:mt-6"
                            >
                              {{ document.documentCategory.title }}
                            </h3>
                            <dl
                              v-if="document.documentCategory.description"
                              class="mt-2 flex grow flex-col justify-between text-left"
                            >
                              <template v-if="document.statusCode === KycDocumentStatus.APPROVED">
                                <dt class="sr-only">Information</dt>
                                <dd class="mt-3 text-sm leading-relaxed text-emerald-800">
                                  <p>Your {{ document.documentType.title }} has been successfully verified.</p>
                                </dd>
                                <dt class="sr-only">Verified</dt>
                                <dd class="mt-4 text-center">
                                  <span
                                    class="inline-flex items-center justify-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800"
                                  >
                                    Verified
                                  </span>
                                </dd>
                              </template>
                              <template
                                v-else-if="
                                  document.statusCode === KycDocumentStatus.PENDING_VERIFICATION ||
                                  document.statusCode === KycDocumentStatus.PROCESSING ||
                                  document.statusCode === KycDocumentStatus.REVIEW_REQUIRED
                                "
                              >
                                <dt class="sr-only">Information</dt>
                                <dd class="mt-3 text-sm leading-relaxed text-gray-700">
                                  <p>
                                    Your
                                    <span class="font-semibold">{{ document.documentType.title }}</span>
                                    is currently under verification.
                                  </p>
                                </dd>
                                <dt class="sr-only">Verifying</dt>
                                <dd class="mt-4 text-center">
                                  <span
                                    class="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-800"
                                  >
                                    <span class="relative flex h-2 w-2">
                                      <span
                                        class="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"
                                      />
                                      <span class="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                                    </span>
                                    Verifying
                                  </span>
                                </dd>
                              </template>
                              <template v-else-if="document.statusCode === KycDocumentStatus.REJECTED">
                                <dt class="sr-only">Information</dt>
                                <dd class="mt-3 text-sm leading-relaxed text-red-800">
                                  <p>
                                    We were unable to verify your document
                                    <span class="font-semibold">{{ document.documentType.title }}</span>.
                                  </p>
                                </dd>
                                <dt class="sr-only">Failed</dt>
                                <dd class="mt-4 text-center">
                                  <span
                                    class="inline-flex items-center justify-center rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-800"
                                  >
                                    Failed
                                  </span>
                                </dd>
                              </template>
                            </dl>
                          </div>
                        </li>
                      </template>
                    </template>
                    <template v-if="customer.data?.pendingDocuments.length > 0">
                      <li
                        v-for="pendingCategory in customer.data?.pendingDocuments"
                        :key="pendingCategory.id"
                        class="group relative col-span-1 flex flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-gradient-to-b from-white to-gray-50/80 text-center shadow-sm ring-1 ring-black/[0.03] transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg"
                      >
                        <div
                          class="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand-400/15 opacity-0 blur-2xl transition duration-500 group-hover:opacity-100"
                          aria-hidden="true"
                        />
                        <div class="relative flex flex-1 flex-col p-6 sm:p-7">
                          <div
                            class="mx-auto inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-200/60 transition duration-300 group-hover:scale-[1.06] group-hover:shadow-md sm:size-16"
                          >
                            <IdentificationIcon class="size-8 sm:size-9" />
                          </div>
                          <h3 class="mt-5 text-sm font-semibold text-gray-900 sm:mt-6">
                            {{ pendingCategory.title }}
                          </h3>
                          <dl
                            v-if="pendingCategory.description"
                            class="mt-2 flex grow flex-col justify-between text-left"
                          >
                            <dt class="sr-only">Information</dt>
                            <dd class="mt-3 text-sm leading-relaxed text-gray-600">
                              <p>{{ pendingCategory.description }}</p>
                            </dd>
                            <dt class="sr-only">Start Verification</dt>
                            <dd class="mt-5 text-center">
                              <router-link
                                :to="{ name: 'categoryView', params: { category: pendingCategory.id } }"
                                class="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:gap-2 hover:bg-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                              >
                                Start Verification
                                <span aria-hidden="true">→</span>
                              </router-link>
                            </dd>
                          </dl>
                        </div>
                      </li>
                    </template>
                  </ul>
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

          <aside class="lg:col-span-1" aria-label="Verification tips">
            <div
              class="sticky top-24 space-y-4 rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm ring-1 ring-gray-900/[0.03] sm:p-6"
            >
              <h3 class="text-sm font-semibold text-gray-900">Why we verify</h3>
              <p class="text-sm leading-relaxed text-gray-600">
                Identity checks help protect your money, meet regulations, and keep Payvel safe for everyone.
              </p>
              <ul class="space-y-3 text-sm text-gray-600">
                <li class="flex gap-2">
                  <span class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">1</span>
                  <span>Complete each category when prompted.</span>
                </li>
                <li class="flex gap-2">
                  <span class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">2</span>
                  <span>Use clear photos—no glare or cut-off edges.</span>
                </li>
                <li class="flex gap-2">
                  <span class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">3</span>
                  <span>We will notify you as soon as a step is approved.</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>