<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import { useCustomerStore } from "@/stores/customer.js";
import { useCustomerUtils } from "@/composables/customer_utils.js";
import { computed, onMounted, ref } from "vue";
import Calculator from "@/components/Calculator.vue";
import {
  EnvelopeIcon,
  IdentificationIcon,
  UsersIcon,
  PaperAirplaneIcon,
  HomeIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
} from '@heroicons/vue/24/outline'
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from "@headlessui/vue";
import AddRecipientWizard from "@/components/Recipient/AddRecipientWizard.vue";
import router from "@/router/index.js";
import CustomerTask from "@/enums/customer_task.js";
import { CustomerTask as CustomerTaskModal } from "@/models/customer_task.js";
import CustomerTaskStatus from "@/enums/customer_task_status.js";
import Task from "@/components/Customer/Task.vue";
import { useTransactionUtils } from "@/composables/transaction_utils.js";
import { useTimeUtils } from "@/composables/time_utils.js";
import Transaction from "@/models/transaction.js";
import ListItem from "@/components/Transaction/ListItem.vue";
import ListShimmer from "@/components/Transaction/ListShimmer.vue";
import Pagination from "@/components/Pagination.vue";
import { useRecipientUtils } from "@/composables/recipient_utils.js";
import Recipient from "@/models/recipient.js";
import RecipientCard from "@/components/Recipient/RecipientCard.vue";
import RecipientCardShimmer from "@/components/Recipient/RecipientCardShimmer.vue";
import { UserPlusIcon, PlusIcon } from "@heroicons/vue/24/outline/index.js";
import { DotLottieVue } from "@lottiefiles/dotlottie-vue";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();
const transactionUtils = useTransactionUtils();
const recipientUtils = useRecipientUtils();
const isCreateRecipientModalOpen = ref(false);
const createRecipient = () => {
  isCreateRecipientModalOpen.value = true;
};

/**
 * @type {{data: Customer|null}}
 */
const customer = customerStore.customer;

const taskItems = [
  {
    id: CustomerTask.EMAIL_VERIFICATION,
    title: '',
    description: '',
    status: '',
    icon: EnvelopeIcon,
    background: 'bg-pink-500',
    href: { name: 'onboardingWorkflow' },
  },
  {
    id: CustomerTask.HAS_CONTACT_NUMBER,
    title: '',
    description: '',
    status: '',
    icon: DevicePhoneMobileIcon,
    background: 'bg-brand-500',
    completed: false,
    href: { name: 'onboardingWorkflow' },
  },
  {
    id: CustomerTask.HAS_IDENTITY_DOCUMENT,
    title: '',
    description: '',
    status: '',
    icon: IdentificationIcon,
    background: 'bg-yellow-500',
    completed: false,
    href: null,
  },
  {
    id: CustomerTask.HAS_ADDRESS,
    title: '',
    description: '',
    status: '',
    icon: HomeIcon,
    background: 'bg-green-500',
    completed: false,
    href: null,
  },
  {
    id: CustomerTask.RECIPIENT_CREATED,
    title: '',
    description: '',
    status: '',
    icon: UsersIcon,
    background: 'bg-blue-500',
    completed: false,
    href: null,
    action: createRecipient,
  },
  {
    id: CustomerTask.TRANSACTION_SENT,
    title: '',
    description: '',
    status: '',
    icon: PaperAirplaneIcon,
    background: 'bg-brand-500',
    completed: false,
    href: null,
  },
]

const tasks = computed(() => {
  return taskItems.filter((taskItem) => serverTasks.value.find((serverTask) => serverTask.id === taskItem.id)).map((taskItem) => {
    const serverTask = serverTasks.value.find((serverTask) => serverTask.id === taskItem.id);
    taskItem.title = serverTask?.title;
    taskItem.description = serverTask?.description;
    taskItem.status = serverTask?.status;
    if (taskItem.id === CustomerTask.HAS_IDENTITY_DOCUMENT) {
      const pendingPoi = customer.data?.pendingDocuments?.find(cat => cat.code === 'POI');
      if (pendingPoi) {
        taskItem.href = serverTask?.status === CustomerTaskStatus.PENDING ? {
          name: 'categoryView',
          params: {
            category: pendingPoi.id
          },
          query: { _utm: 'dashboard-todos' }
        } : null;
      } else {
        taskItem.status = CustomerTaskStatus.COMPLETED;
        taskItem.completed = true;
      }
    }

    return taskItem;
  });
});


const isTransactionLoading = ref(true);
const isTaskLoading = ref(true);
const isRecipientsLoading = ref(true);
const serverTasks = ref([]);
const recipients = ref([]);
const recipientsPagination = ref(null);
const colors = [
  "pink",
  "indigo",
  "yellow",
  "green",
  "blue",
  "blue",
];

// --- map color names for avatars
const colorClasses = {
  pink: "bg-pink-100 text-pink-700",
  indigo: "bg-indigo-100 text-indigo-700",
  yellow: "bg-yellow-100 text-yellow-700",
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
};

// --- initials helper (first + last initials; if single name use first two chars)
function getInitials(name) {
  if (!name || typeof name !== "string") return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const first = parts[0][0] || "";
  const last = parts[parts.length - 1][0] || "";
  return (first + last).toUpperCase();
}

const getTasks = async () => {
  customerUtils.tasks().then((response) => {
    serverTasks.value = response.data.map((task) => CustomerTaskModal.getInstance(task));
  }).finally(() => {
    isTaskLoading.value = false;
  });
}

const timeUtils = useTimeUtils();
const transactionsData = ref(null);

async function getTransactions(page = null) {
  isTransactionLoading.value = true;
  await transactionUtils.get(page).then((response) => {
    transactionsData.value = response.data;
  }).finally(() => {
    isTransactionLoading.value = false;
  });
}

async function getRecipients(page = null) {
  const query = { page: page };
  await recipientUtils.get(query).then((response) => {
    recipients.value = response.data.data.map((r) => Recipient.getInstance(r));
    recipientsPagination.value = response.data.pagination;
    isRecipientsLoading.value = false;
  });
}

onMounted(async () => {
  if (!customerStore.isLoaded) {
    customerUtils.refresh().catch();
  }
  await getTransactions();
  getTasks().catch();
  await getRecipients();
});

const transactions = computed(() => {
  return transactionsData.value?.data.map((data) => {
    const transaction = Transaction.getInstance(data);
    return {
      data: transaction,
      niceTime: timeUtils.getNiceTime(transaction.createdAt)
    }
  });
})

const recipientCreated = (recipient) => {
  isCreateRecipientModalOpen.value = false;
  router.push({ name: 'viewRecipient', params: { id: recipient.id } });
};
</script>
<template>
  <CustomerLayout>
    <main class="bg-gray-50">
      <div class="mx-auto max-w-3xl  sm:px-6 lg:max-w-full lg:px-8">
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_50%_at_50%_-20%,rgba(20,184,166,0.12),transparent)]"
          aria-hidden="true" />
        <div class="pointer-events-none absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-brand-400/[0.1] blur-3xl"
          aria-hidden="true" />
        <h1 class="sr-only">Dashboard</h1>
        <!-- Main 3 column grid -->
        <h2 class="text-base font-semibold text-gray-900 mb-5">Welcome {{ customer.data?.name }}</h2>
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch lg:gap-8">
          <!-- Left column (Calculator) -->
          <div class="grid min-h-0 grid-cols-1 gap-4 lg:h-full lg:min-h-0">
            <section id="send-money" aria-labelledby="section-2-title"
              class="flex min-h-0 flex-col scroll-mt-24 lg:h-full">
              <h2 class="sr-only" id="section-2-title">Send Money</h2>
              <div class="flex min-h-0 flex-1 flex-col rounded-3xl bg-white p-5 pb-8 shadow-lg lg:h-full">
                <Calculator />
              </div>
            </section>
          </div>
          <!-- Right column: TRANSACTION HISTORY -->
          <aside class="flex min-h-0 flex-col lg:col-span-2 lg:h-full">
            <section aria-labelledby="transactions-title" class="flex min-h-0 flex-1 flex-col lg:h-full">
              <h2 id="transactions-title" class="sr-only">Recent transactions</h2>

              <div class="-mt-2 flex min-h-0 flex-1 flex-col lg:h-full">
                <template v-if="isTransactionLoading">
                  <div class="flex min-h-0 flex-1 flex-col rounded-t-lg border border-solid border-gray-100 bg-white">
                    <div class="-mx-4 -my-2 min-h-0 flex-1 overflow-x-auto sm:-mx-6 lg:-mx-8">
                      <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <ListShimmer />
                      </div>
                    </div>
                  </div>
                </template>

                <template v-else>
                  <template v-if="transactions?.length > 0">
                    <div class="flex min-h-0 flex-1 flex-col gap-4">
                      <div class="min-h-0 flex-1 rounded-t-lg border border-solid border-gray-100 bg-white">
                        <div class="-mx-4 -my-2 min-h-0 overflow-x-auto sm:-mx-6 lg:-mx-8">
                          <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                            <ul role="list" class="divide-y divide-gray-100">
                              <template v-for="(transaction, i) in transactions" :key="transaction.data.id">
                                <router-link :class="{ 'rounded-t-lg': i === 0 }" as="li"
                                  :to="{ name: 'viewTransaction', params: { transactionId: transaction.data.id } }"
                                  class="flex cursor-pointer justify-between gap-x-6 px-6 py-5 hover:bg-gray-50 sm:px-8">
                                  <ListItem :niceTime="transaction.niceTime" :transaction="transaction.data" />
                                </router-link>
                              </template>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div class="shrink-0 px-4 pb-4">
                        <Pagination v-if="transactionsData?.pagination" :pagination="transactionsData.pagination"
                          @pageClicked="getTransactions" />
                      </div>
                    </div>
                  </template>

                  <template v-else>
                    <div
                      class="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center rounded-3xl border border-gray-300 bg-white p-12 text-center shadow-lg lg:min-h-0">
                      <div
                        class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_50%_at_50%_-20%,rgba(20,184,166,0.12),transparent)]"
                        aria-hidden="true" />
                      <div
                        class="pointer-events-none absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-brand-400/[0.1] blur-3xl"
                        aria-hidden="true" />
                      <div class="mb-3 flex w-full shrink-0 justify-center" role="img"
                        aria-label="Animation illustrating money transfer">
                        <DotLottieVue
                          class="mx-auto h-28 w-full max-w-[min(100%,22rem)] object-contain md:h-[17rem] md:max-w-[36rem]"
                          autoplay loop src="/animation/money.json" />
                      </div>
                      <p class="mt-2 block text-lg font-semibold text-gray-900">No Transactions Yet</p>
                      <p class="mt-2 max-w-sm text-sm text-gray-600">
                        Your recent transactions will appear here.
                      </p>
                    </div>
                  </template>
                </template>
              </div>
            </section>
          </aside>
        </div>

        <!--------- recipients ---------->
        <div class="mt-8">
          <section aria-labelledby="recipients-title">
            <!-- CARD CONTAINER -->
            <div class="relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm">
              <!-- Friends illustration: desktop top-right only -->
              <div
                class="pointer-events-none absolute right-2 top-2 z-0 hidden h-28 w-28 lg:block xl:right-3 xl:top-3 xl:h-32 xl:w-32"
                aria-hidden="true">
                <DotLottieVue class="h-full w-full object-contain object-right object-top" autoplay loop
                  src="/animation/friends.json" />
              </div>

              <!-- HEADER -->
              <div
                class="relative z-10 mb-4 flex items-center justify-between gap-4 pr-0 lg:pr-[8.5rem] xl:pr-[9.5rem]">
                <h2 id="recipients-title" class="min-w-0 text-lg font-semibold text-gray-800">
                  Send to Friend
                </h2>
                <button type="button" class="shrink-0 text-sm font-medium text-brand-700 hover:underline"
                  @click="router.push({ name: 'recipients' })">
                  Manage Contacts
                </button>
              </div>
              <!-- AVATAR LIST -->
              <div class="relative z-10 flex items-center gap-4 overflow-x-auto scrollbar-hide">
                <!-- ADD NEW -->
                <div @click="createRecipient" class="flex flex-col items-center cursor-pointer min-w-[60px]">
                  <div
                    class="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xl">
                    +
                  </div>
                  <span class="text-xs mt-2 text-gray-500">New</span>
                </div>
                <!-- RECIPIENTS -->
                <div v-for="(recipient, index) in recipients" :key="recipient.id"
                  class="flex flex-col items-center justify-center min-w-[60px] cursor-pointer">
                  <router-link :to="{ name: 'viewRecipient', params: { id: recipient.id } }"
                    class="flex flex-col items-center justify-center">
                    <!-- Circle Avatar -->
                    <div
                      class="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold leading-none text-center shrink-0 overflow-hidden"
                      :class="colorClasses[colors[index % colors.length]]">
                      <span class="block leading-none">
                        {{ getInitials(recipient.name) }}
                      </span>
                    </div>
                    <!-- Name -->
                    <span class="text-xs mt-2 text-gray-600 truncate w-14 text-center">
                      {{ recipient.name }}
                    </span>
                  </router-link>
                </div>
              </div>
            </div>

            <template v-if="isRecipientsLoading">
              <ul class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 border-t border-gray-200 py-6">
                <li v-for="i in 6" :key="i">
                  <RecipientCardShimmer />
                </li>
              </ul>
            </template>
          </section>
        </div>
      </div>
    </main>
    <TransitionRoot as="div" :show="isCreateRecipientModalOpen">
      <Dialog class="relative z-10" @close="isCreateRecipientModalOpen = false">
        <TransitionChild as="div" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100"
          leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild as="div" enter="ease-out duration-300"
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

<style scoped>
@keyframes heartbeat-opacity {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

.pulse {
  animation: heartbeat-opacity 1.5s infinite ease-in-out;
}
</style>