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
import {useRecipientUtils} from "@/composables/recipient_utils.js";
import router from "@/router/index.js";

const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();
const recipientUtils = useRecipientUtils();
const isCreateRecipientModalOpen = ref(false);
const createRecipient = () => {
  isCreateRecipientModalOpen.value = true;
};

/**
 * @type {{data: Customer|null}}
 */
const customer = customerStore.customer;

const items = [
  {
    id: 'emailVerification',
    title: 'Verify Email Address',
    completedTitle: 'Email Verified',
    description: 'Confirm your email address to activate your account and start sending money securely.',
    completedDescription: 'Email address successfully verified. Your account is now ready for transactions.',
    icon: EnvelopeIcon,
    background: 'bg-pink-500',
    completed: false,
    href: {name: 'onboardingWorkflow'},
  },
  {
    id: 'contactNumberProvided',
    title: 'Provide Contact Number',
    completedTitle: 'Contact Number Verified',
    description: 'Provide your mobile number to receive important notifications and secure your account.',
    completedDescription: 'Contact number verified. You will receive important updates on your phone.',
    icon: DevicePhoneMobileIcon,
    background: 'bg-indigo-500',
    completed: false,
    href: {name: 'onboardingWorkflow'},
  },
  {
    id: 'identityVerified',
    title: 'Verify Your Identity',
    completedTitle: 'Identity Verified',
    description: 'Upload a government-issued ID to comply with financial regulations and protect your transactions.',
    completedDescription: 'Identity successfully verified. You are now compliant with financial regulations.',
    icon: IdentificationIcon,
    background: 'bg-yellow-500',
    completed: false,
    href: null,
  },
  {
    id: 'addressDetailsProvided',
    title: 'Add Address Details',
    completedTitle: 'Address Details Added',
    description: 'Provide your residential address to complete your profile and enable secure transfers.',
    completedDescription: 'Address details added. Your profile is now more secure.',
    icon: HomeIcon,
    background: 'bg-green-500',
    completed: false,
    href: null,
  },
  {
    id: 'recipientCreated',
    title: 'Create a Recipient',
    completedTitle: 'Recipient Added',
    description: 'Add the details and payment information of the person you want to send money to.',
    completedDescription: 'Recipient added. You are ready to send money.',
    icon: UsersIcon,
    background: 'bg-blue-500',
    completed: false,
    href: null,
    action: createRecipient,
  },
  {
    id: 'transactionSent',
    title: 'Send a Transaction',
    completedTitle: 'Transaction Sent',
    description: 'Initiate a secure money transfer to your recipient and track its progress.',
    completedDescription: 'Transaction sent successfully. You can track your transfer in your account.',
    icon: PaperAirplaneIcon,
    background: 'bg-purple-500',
    completed: false,
    href: null,
  },
]

const tasks = computed(() => {
  return items.map((item) => {
    if (item.id === 'emailVerification') {
      item.completed = customer.data?.account?.isEmailVerified ?? false;
    } else if (item.id === 'contactNumberProvided') {
      item.completed = customer.data?.mobileNumber ?? false;
    } else if (item.id === 'identityVerified') {
      const pendingPoi = customer.data?.pendingDocuments?.find(cat => cat.code === 'POI');
      item.completed = Boolean(pendingPoi) === false;
      item.href = pendingPoi?.id ? {
        name: 'categoryView',
        params: {
          category: pendingPoi.id
        },
        query: {_utm: 'dashboard-todos'}
      } : null;
    } else if (item.id === 'recipientCreated') {
      item.completed = hasRecipients.value;
    }

    return item;
  });
});

const isLoading = ref(false);
const hasRecipients = ref(false);

onMounted(async () => {
  if (! customerStore.isLoaded) {
    isLoading.value = true;
    customerUtils.refresh().finally(() => {
      isLoading.value = false;
    });
  }
  isLoading.value = true;
  recipientUtils.whisper().then(() => {
    hasRecipients.value = true;
  }).catch((e) => {
    if (e.response.status === 404) {
      hasRecipients.value = false;
    } else {
      console.error(e);
    }
  }).finally(() => {
    isLoading.value = false;
  });
});

const recipientCreated = (recipient) => {
  hasRecipients.value = true;
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
                <h2 class="text-base font-semibold text-gray-900">Welcome {{ customerStore.customer.firstName }}</h2>
                <p class="mt-1 text-sm text-gray-500">Get started by completing the following steps.</p>
                <ul v-if="tasks.length > 0" role="list" class="mt-6 grid grid-cols-1 gap-6 border-t border-b border-gray-200 py-6 sm:grid-cols-2">
                  <li v-for="task in tasks" :key="task.id" :class="[isLoading ? 'pulse' : '']" class="flow-root">
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
                    <div v-else :class="{'opacity-60': task.completed}" class="relative -m-2 flex items-center space-x-4 rounded-xl p-2 ring-0 hover:bg-gray-50">
                      <div :class="[task.background, 'flex size-16 shrink-0 items-center justify-center rounded-lg']">
                        <component :is="task.icon" class="size-6 text-white" aria-hidden="true" />
                      </div>
                      <div v-if="task.completed">
                        <div class="text-sm font-medium text-gray-900">
                          <div class="focus:outline-hidden">
                            <span class="absolute inset-0" aria-hidden="true" />
                            <span>{{ task.completedTitle }}</span>
                            <span aria-hidden="true"> &rarr;</span>
                          </div>
                        </div>
                        <p class="mt-1 text-sm text-gray-500">{{ task.completedDescription }}</p>
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
              <div class="rounded-lg bg-white shadow-lg p-5 pb-16">
                <Calculator />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
    <TransitionRoot as="template" :show="isCreateRecipientModalOpen">
      <Dialog class="relative z-10" @close="isCreateRecipientModalOpen = false">
        <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
        </TransitionChild>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
              <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <AddRecipientWizard v:on:recipient:added="recipientCreated" />
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