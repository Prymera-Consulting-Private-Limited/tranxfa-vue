<script setup>
import {failureMessage, logRequestFailure} from "@/composables/api_utils.js";
import LoadFailurePanel from "@/components/LoadFailurePanel.vue";
import CustomerLayout from "@/components/CustomerLayout.vue";
import {computed, onMounted, ref, watch} from "vue";
import {
  ArrowPathIcon,
  BanknotesIcon,
  ClipboardIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  WalletIcon,
} from "@heroicons/vue/24/outline/index.js";
import {UseClipboard} from "@vueuse/components";
import router from "@/router/index.js";
import TermsModal from "@/components/Wallet/TermsModal.vue";
import TopUpFlow from "@/components/Wallet/TopUpFlow.vue";
import PendingTopUps from "@/components/Wallet/PendingTopUps.vue";
import MovementListItem from "@/components/Wallet/MovementListItem.vue";
import WalletAvailability from "@/enums/wallet_availability.js";
import WalletTopup from "@/models/wallet_topup.js";
import WalletMovement from "@/models/wallet_movement.js";
import {useWalletStore} from "@/stores/wallet.js";
import {useWalletUtils} from "@/composables/wallet_utils.js";
import {useTimeUtils} from "@/composables/time_utils.js";

const walletStore = useWalletStore();
const walletUtils = useWalletUtils();
const timeUtils = useTimeUtils();

const isLoadingWallet = ref(false);
const movementsData = ref(null);
const topups = ref([]);

const isTermsModalOpen = ref(false);
const termsMode = ref('enrol');
const isTopUpOpen = ref(false);
const topupToView = ref(null);

onMounted(async () => {
  if (walletStore.availability === WalletAvailability.UNKNOWN) {
    await walletUtils.probe();
  }
  if (walletStore.availability === WalletAvailability.UNAVAILABLE) {
    await router.replace({name: 'dashboard'});
    return;
  }
  if (walletStore.isEnrolled) {
    await loadWalletData();
  }
});

// Three requests feed this page. If any fails the balance used to show a
// dash and the list said "No movements yet", which reads as an empty
// wallet rather than a failed load.
const loadFailure = ref(null);

function noteFailure(e, context, what) {
  logRequestFailure(e, context);
  loadFailure.value = loadFailure.value ?? failureMessage(e, `We couldn't load ${what}.`);
}

async function loadWalletData() {
  isLoadingWallet.value = true;
  loadFailure.value = null;
  await Promise.all([
    walletUtils.getWallet().catch((e) => noteFailure(e, 'wallet', 'your wallet')),
    refreshTopups(),
    refreshMovements(),
  ]).finally(() => {
    isLoadingWallet.value = false;
  });
}

async function refreshTopups() {
  await walletUtils.getTopups().then((response) => {
    const items = Array.isArray(response.data) ? response.data : (response.data?.data ?? []);
    topups.value = items.map(o => WalletTopup.getInstance(o));
  }).catch((e) => noteFailure(e, 'wallet-topups', 'your pending deposits'));
}

async function refreshMovements() {
  await walletUtils.getMovements().then((response) => {
    movementsData.value = response.data;
  }).catch((e) => noteFailure(e, 'wallet-movements', 'your wallet activity'));
}

watch(() => walletStore.wallet.data, () => {
  if (! isLoadingWallet.value && walletStore.isEnrolled) {
    refreshTopups();
    refreshMovements();
  }
});

const isResolving = computed(() => {
  return walletStore.availability === WalletAvailability.UNKNOWN
      || walletStore.availability === WalletAvailability.UNAVAILABLE
      || isLoadingWallet.value;
});

const balances = computed(() => walletStore.wallet.data?.balances ?? []);

const pendingTopups = computed(() => topups.value.filter(topup => topup.isPending()));

const recentMovements = computed(() => {
  return (movementsData.value?.data ?? []).slice(0, 5).map((data) => {
    const movement = WalletMovement.getInstance(data);
    return {
      data: movement,
      niceTime: timeUtils.getNiceTime(movement.postedAt),
    }
  });
});

function startEnrolment() {
  termsMode.value = 'enrol';
  isTermsModalOpen.value = true;
}

function reviewNewTerms() {
  termsMode.value = 'reaccept';
  isTermsModalOpen.value = true;
}

function addMoney() {
  if (walletStore.requiresReacceptance) {
    reviewNewTerms();
    return;
  }
  topupToView.value = null;
  isTopUpOpen.value = true;
}

function viewTopup(topup) {
  topupToView.value = topup;
  isTopUpOpen.value = true;
}

function topUpFlowClosed() {
  isTopUpOpen.value = false;
  topupToView.value = null;
  refreshTopups();
}

async function termsAccepted() {
  await loadWalletData();
}
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">{{ $t('account.wallet') }}</h1>

        <template v-if="isResolving">
          <div class="rounded-lg bg-white border border-gray-100 p-6 animate-pulse">
            <div class="h-4 w-40 rounded bg-gray-200"></div>
            <div class="mt-4 h-8 w-56 rounded bg-gray-200"></div>
            <div class="mt-6 h-3 w-full rounded bg-gray-200"></div>
            <div class="mt-2 h-3 w-2/3 rounded bg-gray-200"></div>
          </div>
        </template>

        <template v-else-if="! walletStore.isEnrolled">
          <div class="mx-auto max-w-3xl rounded-lg bg-white border border-gray-100 p-8 sm:p-12 text-center">
            <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-50">
              <WalletIcon class="size-7 text-brand-700" aria-hidden="true" />
            </div>
            <h2 class="mt-4 text-xl font-semibold text-gray-900">{{ $t('wallet.yourMoneyReadyToSend') }}</h2>
            <p class="mx-auto mt-2 max-w-md text-sm/6 text-gray-500">{{ $t('wallet.loadMoneyIntoYourWallet') }}</p>
            <div class="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
              <div class="rounded-lg border border-gray-200 p-4">
                <BanknotesIcon class="size-6 text-brand-600" aria-hidden="true" />
                <p class="mt-2 text-sm/6 font-medium text-gray-900">{{ $t('wallet.loadOnceSendManyTimes') }}</p>
              </div>
              <div class="rounded-lg border border-gray-200 p-4">
                <PlusIcon class="size-6 text-brand-600" aria-hidden="true" />
                <p class="mt-2 text-sm/6 font-medium text-gray-900">{{ $t('wallet.payForTransfersInstantlyAt') }}</p>
              </div>
              <div class="rounded-lg border border-gray-200 p-4">
                <ArrowPathIcon class="size-6 text-brand-600" aria-hidden="true" />
                <p class="mt-2 text-sm/6 font-medium text-gray-900">{{ $t('wallet.refundsReturnStraightToYour') }}</p>
              </div>
            </div>
            <button type="button" @click="startEnrolment" class="mt-8 inline-flex items-center justify-center rounded-xl bg-brand-700 px-6 py-2.5 text-sm/6 font-semibold text-white shadow-sm transition hover:bg-brand-800 cursor-pointer">{{ $t('wallet.readTermsAmpActivate') }}</button>
            <p class="mt-3 text-xs/5 text-gray-500">{{ $t('wallet.yourWalletIsActivatedOnce') }}</p>
          </div>
        </template>

        <template v-else-if="loadFailure">
          <LoadFailurePanel :title="$t('wallet.weCouldntLoadYourWallet')" :message="loadFailure" :retryLabel="$t('common.tryAgain')" @retry="loadWalletData" class="mt-0" />
        </template>

        <template v-else>
          <div class="grid gap-8 lg:grid-cols-3">
            <div class="flex flex-col gap-4 lg:col-span-2">

              <div v-if="walletStore.requiresReacceptance" class="border-l-4 border-warning-400 bg-warning-50 p-4 rounded-r-lg">
                <div class="flex items-start">
                  <div class="shrink-0">
                    <ExclamationTriangleIcon class="size-5 text-warning-400" aria-hidden="true" />
                  </div>
                  <div class="ml-3">
                    <p class="text-sm/6 text-warning-700">{{ $t('wallet.weveUpdatedTheWalletTerms2') }}</p>
                    <button type="button" @click="reviewNewTerms" class="mt-2 text-sm/6 font-semibold text-warning-800 hover:text-warning-900 cursor-pointer">{{ $t('wallet.reviewAndAccept') }} <span aria-hidden="true">→</span></button>
                  </div>
                </div>
              </div>

              <div class="rounded-lg bg-white border border-gray-100 px-4 py-5 sm:px-6">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 class="text-sm/6 font-medium text-gray-500">{{ $t('transfer.wizard.walletBalance') }}</h2>
                    <template v-if="balances.length > 0">
                      <p v-for="balance in balances" :key="balance.currency" class="mt-1 text-3xl font-bold tracking-tight text-gray-900">{{ balance.amountFormatted }}</p>
                    </template>
                    <p v-else class="mt-1 text-3xl font-bold tracking-tight text-gray-900">{{ $t('wallet.mdash') }}</p>
                    <UseClipboard v-slot="{ copy, copied }" :source="walletStore.wallet.data?.walletNumber ?? walletStore.subscription.data?.walletNumber">
                      <p class="mt-2 flex items-center gap-x-1.5 text-sm/6 text-gray-500">
                        <span class="tracking-widest">{{ walletStore.wallet.data?.walletNumber ?? walletStore.subscription.data?.walletNumber }}</span>
                        <button @click="copy()" type="button" class="cursor-pointer text-gray-500 hover:text-gray-600" :aria-label="$t('wallet.copyWalletNumber')">
                          <ClipboardIcon class="size-4" aria-hidden="true" />
                        </button>
                        <span v-if="copied" class="text-xs/5 text-success-700">{{ $t('wallet.copied') }}</span>
                      </p>
                    </UseClipboard>
                  </div>
                  <div class="flex shrink-0 flex-col gap-2 sm:items-end">
                    <button type="button" @click="addMoney" class="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm/6 font-semibold text-white shadow-sm transition hover:bg-brand-800 cursor-pointer">
                      <PlusIcon class="size-5" aria-hidden="true" />{{ $t('transfer.wizard.addMone') }}</button>
                    <router-link :to="{name: 'dashboard'}" class="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm/6 font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50">{{ $t('wallet.sendMoney') }}</router-link>
                  </div>
                </div>
              </div>

              <PendingTopUps v-if="pendingTopups.length > 0" v-bind:topups="pendingTopups" v-on:view="viewTopup" v-on:cancelled="refreshTopups" />

              <div class="rounded-lg bg-white border border-gray-100 px-4 py-4 sm:px-6">
                <div class="flex items-center justify-between">
                  <h2 class="text-base font-semibold text-gray-900">{{ $t('wallet.recentMovements') }}</h2>
                  <router-link :to="{name: 'walletStatement'}" class="text-sm/6 font-semibold text-brand-700 hover:text-brand-800">{{ $t('wallet.viewStatement') }} <span aria-hidden="true">→</span></router-link>
                </div>
                <template v-if="recentMovements.length > 0">
                  <ul role="list" class="mt-2 divide-y divide-gray-100">
                    <li v-for="movement in recentMovements" :key="movement.data.id" class="flex justify-between gap-x-6 py-4">
                      <MovementListItem v-bind:movement="movement.data" v-bind:niceTime="movement.niceTime" />
                    </li>
                  </ul>
                </template>
                <template v-else>
                  <p class="mt-3 py-6 text-center text-sm/6 text-gray-500">{{ $t('wallet.noMovementsYetAddMoney') }}</p>
                </template>
              </div>
            </div>

            <div>
              <div class="rounded-lg bg-white border border-gray-100 p-5">
                <h2 class="text-base font-semibold text-gray-900">{{ $t('wallet.addingMoney') }}</h2>
                <ol class="mt-3 space-y-3 text-sm/6 text-gray-600">
                  <li class="flex gap-x-3">
                    <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs/5 font-semibold text-brand-700">1</span>
                    <span>{{ $t('wallet.declareTheAmountYouWant') }}</span>
                  </li>
                  <li class="flex gap-x-3">
                    <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs/5 font-semibold text-brand-700">2</span>
                    <span><i18n-t keypath="wallet.transferFromYourBankTo" scope="global"><template #value><span class="font-semibold text-gray-900">{{ $t('wallet.exactlyThatAmount') }}</span></template></i18n-t></span>
                  </li>
                  <li class="flex gap-x-3">
                    <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs/5 font-semibold text-brand-700">3</span>
                    <span>{{ $t('wallet.theMoneyLandsInYour') }}</span>
                  </li>
                </ol>
                <p class="mt-4 text-xs/5 text-gray-500">{{ $t('wallet.aDeclarationStaysOpenFor') }}</p>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>

    <TermsModal :open="isTermsModalOpen" :mode="termsMode" @close="isTermsModalOpen = false" @accepted="termsAccepted" />
    <TopUpFlow :open="isTopUpOpen" :topup="topupToView" @close="topUpFlowClosed" @declared="refreshTopups" />
  </CustomerLayout>
</template>
