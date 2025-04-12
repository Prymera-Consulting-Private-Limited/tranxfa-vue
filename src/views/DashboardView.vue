<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import {useCustomerStore} from "@/stores/customer.js";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {computed, onMounted, ref} from "vue";
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
import {Dialog, DialogPanel, TransitionChild, TransitionRoot} from "@headlessui/vue";
import AddRecipientWizard from "@/components/Recipient/AddRecipientWizard.vue";
import router from "@/router/index.js";
import CustomerTask from "@/enums/customer_task.js";
import {CustomerTask as CustomerTaskModal} from "@/models/customer_task.js";
import CustomerTaskStatus from "@/enums/customer_task_status.js";
import Task from "@/components/Customer/Task.vue";
import {useTransactionUtils} from "@/composables/transaction_utils.js";
import {useTimeUtils} from "@/composables/time_utils.js";
import Transaction from "@/models/transaction.js";
import ListItem from "@/components/Transaction/ListItem.vue";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();
const transactionUtils = useTransactionUtils();
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
    href: {name: 'onboardingWorkflow'},
  },
  {
    id: CustomerTask.HAS_CONTACT_NUMBER,
    title: '',
    description: '',
    status: '',
    icon: DevicePhoneMobileIcon,
    background: 'bg-indigo-500',
    completed: false,
    href: {name: 'onboardingWorkflow'},
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
    background: 'bg-purple-500',
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
      taskItem.href = serverTask?.status === CustomerTaskStatus.PENDING ? {
        name: 'categoryView',
        params: {
          category: pendingPoi.id
        },
        query: {_utm: 'dashboard-todos'}
      } : null;
    }

    return taskItem;
  });
});

const isLoading = ref(false);
const serverTasks = ref([]);

const getTasks = async () => {
  isLoading.value = true;
  customerUtils.tasks().then((response) => {
    serverTasks.value = response.data.map((task) => CustomerTaskModal.getInstance(task));
  }).finally(() => {
    isLoading.value = false;
  });
}

const timeUtils = useTimeUtils();

const transactionsData = ref(null);

onMounted(async () => {
  if (! customerStore.isLoaded) {
    isLoading.value = true;
    customerUtils.refresh().finally(() => {
      isLoading.value = false;
    });
  }
  await transactionUtils.get().then((response) => {
    transactionsData.value = response.data;
    isLoading.value = false;
  })
  if (transactionsData.value.data.length === 0) {
    await getTasks();
  }
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
  router.push({name: 'viewRecipient', params: {id: recipient.id}});
};
</script>
<template>
  <CustomerLayout>
    <main class="-mt-24 py-8 bg-gray-50">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">Dashboard</h1>
        <!-- Main 3 column grid -->
        <h2 class="text-base font-semibold text-gray-900 mb-5">Welcome {{ customer.data?.name }}</h2>
        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8 lg:flex-row-reverse">

          <!-- Left column -->
          <div class="grid grid-cols-1 gap-4 lg:col-span-2 order-last lg:order-first">
            <section aria-labelledby="section-2-title">
              <h2 class="sr-only" id="section-2-title">Section title</h2>
              <div>
                <div v-if="transactions?.length > 0" class="grid grid-cols-1 gap-4 lg:col-span-2 rounded-t-lg bg-white border border-solid border-gray-100">
                  <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                      <ul role="list" class="divide-y divide-gray-100 shadow-md">
                        <template v-for="(transaction, i) in transactions" :key="transaction.data.id">
                          <router-link :class="{'rounded-t-lg': i === 0}" as="li" :to="{name: 'viewTransaction', params: {transactionId: transaction.data.id}}" class="flex justify-between gap-x-6 py-5 px-6 sm:px-8 cursor-pointer hover:bg-gray-50">
                              <ListItem v-bind:niceTime="transaction.niceTime" v-bind:transaction="transaction.data" />
                          </router-link>
                        </template>
                      </ul>
                    </div>
                  </div>
                </div>
                <template v-else>
                  <p class="mt-1 text-sm text-gray-500 hidden lg:block">Get started by completing the following steps.</p>
                  <ul v-if="tasks.length === 0 && isLoading" role="list" class="mt-6 grid-cols-1 gap-6 xl:border-t-0 xl:border-b-0 border-t border-b border-gray-200 py-6 sm:grid-cols-2 hidden lg:grid">
                    <li v-for="i of 6" :key="i" class="flow-root pulse">
                      <div v-if="isLoading" class="relative -m-2 flex items-center space-x-4 rounded-xl p-2 ring-0">
                        <div :class="['bg-gray-300', 'flex size-16 shrink-0 items-center justify-center rounded-lg']">
                          <DocumentTextIcon class="size-6 text-white" aria-hidden="true" />
                        </div>
                        <div>
                          <h3 class="text-sm font-medium text-gray-900 mb-3">
                            <a href="#" class="focus:outline-hidden">
                              <span class="absolute inset-0" aria-hidden="true" />
                              <div class="h-3 block pulse bg-gray-300 w-full w-64"></div>
                            </a>
                          </h3>
                          <p class="flex flex-col mt-1 text-sm text-gray-500 space-y-1">
                            <span class="h-2 block pulse bg-gray-300 w-48"></span>
                            <span class="h-2 block pulse bg-gray-300 w-32"></span>
                            <span class="h-2 block pulse bg-gray-300 w-24"></span>
                          </p>
                        </div>
                      </div>
                    </li>
                  </ul>
                  <ul v-if="tasks.length > 0 && !isLoading" role="list" class="mt-6 grid-cols-1 xl:grid-cols-3 gap-10 xl:border-t-0 xl:border-b-0 border-t border-b border-gray-200 py-6 hidden lg:grid">
                    <li v-for="(task, index) in tasks" :key="task.id" class="flow-root xl:flex-grow">
                      <div :class="{'opacity-60': task.status !== CustomerTaskStatus.PENDING}" class="relative -m-2 flex items-center space-x-4 rounded-xl p-2 ring-0 xl:hover:bg-purple-50 xl:hover:border-purple-200 xl:flex-col xl:space-y-5 xl:text-center xl:border xl:border-dashed xl:border-gray-200 xl:px-5 xl:py-8 xl:bg-white h-full xl:shadow-xs">
                        <div :class="[task.background, 'flex xl:mx-auto size-16 shrink-0 items-center justify-center rounded-lg xl:hidden']">
                          <component :is="task.icon" class="size-6 text-white" aria-hidden="true" />
                        </div>
                        <div :class="['xl:mx-auto size-16 shrink-0 items-center bg-purple-700 justify-center rounded-full hidden xl:flex']">
                          <component :is="task.icon" class="size-6 text-white" aria-hidden="true" />
                        </div>
                        <div v-if="task.status !== CustomerTaskStatus.PENDING">
                          <Task :task="task" :index="index" />
                        </div>
                        <template v-else>
                          <router-link v-if="task.href" :to="task.href" class="cursor-pointer">
                            <Task :task="task" :index="index" />
                          </router-link>
                          <div v-else-if="task.action || null" @click="task.action" class="cursor-pointer">
                            <Task :task="task" :index="index" />
                          </div>
                          <div v-else>
                            <Task :task="task" :index="index" />
                          </div>
                        </template>
                      </div>
                    </li>
                  </ul>
                </template>
              </div>
            </section>
          </div>

          <!-- Right column -->
          <div class="grid grid-cols-1 gap-4">
            <section aria-labelledby="section-2-title">
              <h2 class="sr-only" id="section-2-title">Send Money</h2>
              <div class="rounded-lg bg-white shadow-lg p-5 pb-8">
                <Calculator />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
    <TransitionRoot as="div" :show="isCreateRecipientModalOpen">
      <Dialog class="relative z-10" @close="isCreateRecipientModalOpen = false">
        <TransitionChild as="div" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild as="div" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
              <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
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
  0%, 100% {
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