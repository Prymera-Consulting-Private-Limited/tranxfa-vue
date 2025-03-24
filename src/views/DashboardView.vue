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

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();
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

onMounted(async () => {
  if (! customerStore.isLoaded) {
    isLoading.value = true;
    customerUtils.refresh().finally(() => {
      isLoading.value = false;
    });
  }
  await getTasks();
});

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
        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8">
          <!-- Left column -->
          <div class="grid grid-cols-1 gap-4 lg:col-span-2">
            <section aria-labelledby="section-2-title">
              <h2 class="sr-only" id="section-2-title">Section title</h2>
              <div>
                <h2 class="text-base font-semibold text-gray-900">Welcome {{ customer.data?.firstName }}</h2>
                <p class="mt-1 text-sm text-gray-500">Get started by completing the following steps.</p>
                <ul v-if="tasks.length === 0 && isLoading" role="list" class="mt-6 grid grid-cols-1 gap-6 border-t border-b border-gray-200 py-6 sm:grid-cols-2">
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
                <ul v-if="tasks.length > 0 && !isLoading" role="list" class="mt-6 grid grid-cols-1 gap-6 border-t border-b border-gray-200 py-6 sm:grid-cols-2">
                  <li v-for="task in tasks" :key="task.id" class="flow-root">
                    <div :class="{'opacity-60': task.status !== CustomerTaskStatus.PENDING}" class="relative -m-2 flex items-center space-x-4 rounded-xl p-2 ring-0 hover:bg-gray-50">
                      <div :class="[task.background, 'flex size-16 shrink-0 items-center justify-center rounded-lg']">
                        <component :is="task.icon" class="size-6 text-white" aria-hidden="true" />
                      </div>
                      <div v-if="task.status !== CustomerTaskStatus.PENDING">
                        <div class="text-sm font-medium text-gray-900">
                          <div class="focus:outline-hidden">
                            <span class="absolute inset-0" aria-hidden="true" />
                            <span>{{ task.title }}</span>
                            <span aria-hidden="true"> &rarr;</span>
                          </div>
                        </div>
                        <p class="mt-1 text-sm text-gray-500">{{ task.description }}</p>
                      </div>
                      <template v-else>
                        <router-link v-if="task.href" :to="task.href" class="cursor-pointer">
                          <div class="text-sm font-medium text-gray-900">
                            <div class="focus:outline-hidden">
                              <span class="absolute inset-0" aria-hidden="true" />
                              <span>{{ task.title }}</span>
                              <span aria-hidden="true"> &rarr;</span>
                            </div>
                          </div>
                          <p class="mt-1 text-sm text-gray-500">{{ task.description }}</p>
                        </router-link>
                        <div v-else-if="task.action || null" @click="task.action" class="cursor-pointer">
                          <div class="text-sm font-medium text-gray-900">
                            <div class="focus:outline-hidden">
                              <span class="absolute inset-0" aria-hidden="true" />
                              <span>{{ task.title }}</span>
                              <span aria-hidden="true"> &rarr;</span>
                            </div>
                          </div>
                          <p class="mt-1 text-sm text-gray-500">{{ task.description }}</p>
                        </div>
                        <div v-else class="cursor-pointer">
                          <div class="text-sm font-medium text-gray-900">
                            <div class="focus:outline-hidden">
                              <span class="absolute inset-0" aria-hidden="true" />
                              <span>{{ task.title }}</span>
                              <span aria-hidden="true"> &rarr;</span>
                            </div>
                          </div>
                          <p class="mt-1 text-sm text-gray-500">{{ task.description }}</p>
                        </div>
                      </template>
                    </div>
                  </li>
                </ul>
                <div class="mt-4 flex">
                  <a href="#" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                    Or complete these steps later
                    <span aria-hidden="true"> &rarr;</span>
                  </a>
                </div>
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