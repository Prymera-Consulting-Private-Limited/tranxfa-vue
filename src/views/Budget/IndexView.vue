<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import { computed, onMounted, ref, watch } from "vue";
import { useMonthlyBudgetUtils } from "@/composables/monthly_budget_utils.js";
import MonthlyBudget from "@/models/monthly_budget.js";
import BudgetCard from "@/components/Budget/BudgetCard.vue";
import BudgetCardShimmer from "@/components/Budget/BudgetCardShimmer.vue";
import CreateBudgetForm from "@/components/Budget/CreateBudgetForm.vue";
import Pagination from "@/components/Pagination.vue";
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from "@headlessui/vue";
import { PlusIcon } from "@heroicons/vue/24/outline";
import { DotLottieVue } from "@lottiefiles/dotlottie-vue";

const monthlyBudgetUtils = useMonthlyBudgetUtils();

const TABS = {
  CURRENT: "current",
  HISTORY: "history",
};

const activeTab = ref(TABS.CURRENT);
const isLoading = ref(true);
const data = ref(null);
const isCreateModalOpen = ref(false);

async function loadBudgets(page = null) {
  isLoading.value = true;
  try {
    const response =
      activeTab.value === TABS.CURRENT
        ? await monthlyBudgetUtils.getCurrent(page)
        : await monthlyBudgetUtils.getHistory(page);
    data.value = response.data;
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadBudgets();
});

watch(activeTab, () => {
  loadBudgets();
});

const budgets = computed(() => {
  return data.value?.data?.map((item) => MonthlyBudget.getInstance(item)) ?? [];
});

const showPagination = computed(() => {
  return (data.value?.pagination?.total_pages ?? 1) > 1;
});

function switchTab(tab) {
  if (activeTab.value !== tab) {
    activeTab.value = tab;
  }
}

function openCreateModal() {
  isCreateModalOpen.value = true;
}

function onBudgetCreated() {
  isCreateModalOpen.value = false;
  activeTab.value = TABS.CURRENT;
  loadBudgets();
}
</script>

<template>
  <CustomerLayout>
    <main class="bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <div class="mx-auto max-w-full px-4 pb-10 sm:px-6 sm:pb-12 lg:px-8">
        <h1 class="sr-only">Monthly budgets</h1>

        <header
          class="relative overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm sm:p-6 lg:p-8"
        >
          <div
            class="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-100/60 blur-2xl sm:size-64"
            aria-hidden="true"
          />
          <div
            class="pointer-events-none absolute -bottom-20 -left-10 size-40 rounded-full bg-teal-100/40 blur-2xl"
            aria-hidden="true"
          />

          <div class="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
            <div class="min-w-0 max-w-2xl">
              <p class="text-xs font-semibold uppercase tracking-wide text-brand-700">
                Spending limits
              </p>
              <h2 id="budgets-heading" class="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Monthly budgets
              </h2>
              <p class="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
                Set a monthly limit per currency and track how much you have spent and have left.
              </p>
            </div>
            <div class="flex shrink-0 flex-col gap-2 sm:items-end">
              <button
                type="button"
                class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-700/20 transition hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 sm:w-auto sm:px-5 sm:py-2.5"
                @click="openCreateModal"
              >
                <PlusIcon class="size-5 shrink-0" aria-hidden="true" />
                Create budget
              </button>
              <p class="text-center text-xs text-gray-500 sm:text-right">
                One budget per currency per month
              </p>
            </div>
          </div>
        </header>

        <div class="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Budget views">
          <button
            type="button"
            role="tab"
            :aria-selected="activeTab === TABS.CURRENT"
            :class="[
              activeTab === TABS.CURRENT
                ? 'bg-brand-700 text-white shadow-sm'
                : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50',
              'rounded-full px-4 py-2 text-sm font-semibold transition',
            ]"
            @click="switchTab(TABS.CURRENT)"
          >
            Current
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="activeTab === TABS.HISTORY"
            :class="[
              activeTab === TABS.HISTORY
                ? 'bg-brand-700 text-white shadow-sm'
                : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50',
              'rounded-full px-4 py-2 text-sm font-semibold transition',
            ]"
            @click="switchTab(TABS.HISTORY)"
          >
            History
          </button>
        </div>

        <section class="mt-8 sm:mt-10" aria-labelledby="budgets-heading">
          <template v-if="isLoading">
            <ul
              role="list"
              class="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
            >
              <li
                v-for="i in 6"
                :key="i"
                class="min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100"
              >
                <BudgetCardShimmer />
              </li>
            </ul>
          </template>

          <template v-else>
            <template v-if="budgets.length > 0">
              <ul
                role="list"
                class="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
              >
                <li
                  v-for="budget in budgets"
                  :key="budget.id"
                  class="min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-200/60"
                >
                  <BudgetCard :budget="budget" />
                </li>
              </ul>

              <div
                v-if="showPagination"
                class="mt-8 w-full min-w-0 rounded-2xl border border-gray-100 bg-white/80 px-3 py-4 shadow-sm sm:mt-10 sm:px-6"
              >
                <Pagination :pagination="data.pagination" @pageClicked="loadBudgets" />
              </div>
            </template>

            <template v-else>
              <div
                class="relative overflow-hidden rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-white to-gray-50/90 px-6 py-14 text-center shadow-inner sm:px-10 sm:py-16"
              >
                <div
                  class="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-brand-50/50 to-transparent"
                  aria-hidden="true"
                />
                <div class="relative mx-auto flex max-w-md flex-col items-center">
                  <div class="mb-3 flex w-full shrink-0 justify-center" role="img" aria-label="No budgets">
                    <DotLottieVue
                      class="mx-auto h-26 w-full max-w-[min(100%,22rem)] object-contain md:h-[14rem] md:max-w-[36rem]"
                      autoplay
                      loop
                      src="/animation/no-result.json"
                    />
                  </div>
                  <h3 class="mt-6 text-lg font-semibold text-gray-900 sm:text-xl">
                    <template v-if="activeTab === TABS.CURRENT">No active budgets</template>
                    <template v-else>No budget history</template>
                  </h3>
                  <p class="mt-2 text-sm leading-relaxed text-gray-600">
                    <template v-if="activeTab === TABS.CURRENT">
                      Create a monthly budget to track spending against your transfer activity.
                    </template>
                    <template v-else>
                      Past monthly budgets will appear here once you have used the feature.
                    </template>
                  </p>
                  <button
                    v-if="activeTab === TABS.CURRENT"
                    type="button"
                    class="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-700/20 transition hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                    @click="openCreateModal"
                  >
                    <PlusIcon class="size-5 shrink-0" aria-hidden="true" />
                    Create your first budget
                  </button>
                </div>
              </div>
            </template>
          </template>
        </section>
      </div>
    </main>

    <TransitionRoot as="template" :show="isCreateModalOpen">
      <Dialog class="relative z-10" @close="isCreateModalOpen = false">
        <TransitionChild
          as="template"
          enter="ease-out duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="ease-in duration-200"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild
              as="template"
              enter="ease-out duration-300"
              enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enter-to="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leave-from="opacity-100 translate-y-0 sm:scale-100"
              leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel
                class="relative w-full transform overflow-hidden rounded-2xl bg-white px-5 py-6 text-left shadow-xl transition-all sm:my-8 sm:max-w-lg sm:p-8"
              >
                <CreateBudgetForm
                  @budget:created="onBudgetCreated"
                  @cancel="isCreateModalOpen = false"
                />
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </CustomerLayout>
</template>
