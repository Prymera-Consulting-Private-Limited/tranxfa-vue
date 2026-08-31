<script setup>
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

async function loadWalletData() {
  isLoadingWallet.value = true;
  await Promise.all([
    walletUtils.getWallet().catch(() => {}),
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
  }).catch(() => {});
}

async function refreshMovements() {
  await walletUtils.getMovements().then((response) => {
    movementsData.value = response.data;
  }).catch(() => {});
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
        <h1 class="sr-only">Wallet</h1>

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
            <h2 class="mt-4 text-xl font-semibold text-gray-900">Your money, ready to send</h2>
            <p class="mx-auto mt-2 max-w-md text-sm text-gray-500">Load money into your wallet by bank transfer and pay for transfers instantly — no waiting on your bank at checkout, and refunds come straight back to your balance.</p>
            <div class="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
              <div class="rounded-lg border border-gray-200 p-4">
                <BanknotesIcon class="size-6 text-brand-600" aria-hidden="true" />
                <p class="mt-2 text-sm font-medium text-gray-900">Load once, send many times</p>
              </div>
              <div class="rounded-lg border border-gray-200 p-4">
                <PlusIcon class="size-6 text-brand-600" aria-hidden="true" />
                <p class="mt-2 text-sm font-medium text-gray-900">Pay for transfers instantly at checkout</p>
              </div>
              <div class="rounded-lg border border-gray-200 p-4">
                <ArrowPathIcon class="size-6 text-brand-600" aria-hidden="true" />
                <p class="mt-2 text-sm font-medium text-gray-900">Refunds return straight to your wallet</p>
              </div>
            </div>
            <button type="button" @click="startEnrolment" class="mt-8 inline-flex items-center justify-center rounded-xl bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 cursor-pointer">Read terms &amp; activate</button>
            <p class="mt-3 text-xs text-gray-400">Your wallet is activated once you accept its terms.</p>
          </div>
        </template>

        <template v-else>
          <div class="grid gap-8 lg:grid-cols-3">
            <div class="flex flex-col gap-4 lg:col-span-2">

              <div v-if="walletStore.requiresReacceptance" class="border-l-4 border-yellow-400 bg-yellow-50 p-4 rounded-r-lg">
                <div class="flex items-start">
                  <div class="shrink-0">
                    <ExclamationTriangleIcon class="size-5 text-yellow-400" aria-hidden="true" />
                  </div>
                  <div class="ml-3">
                    <p class="text-sm text-yellow-700">We've updated the wallet terms. Your balance is safe and visible, but adding and spending money is paused until you accept the new version.</p>
                    <button type="button" @click="reviewNewTerms" class="mt-2 text-sm font-semibold text-yellow-800 hover:text-yellow-900 cursor-pointer">Review and accept &rarr;</button>
                  </div>
                </div>
              </div>

              <div class="rounded-lg bg-white border border-gray-100 px-4 py-5 sm:px-6">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 class="text-sm font-medium text-gray-500">Wallet balance</h2>
                    <template v-if="balances.length > 0">
                      <p v-for="balance in balances" :key="balance.currency" class="mt-1 text-3xl font-bold tracking-tight text-gray-900">{{ balance.amountFormatted }}</p>
                    </template>
                    <p v-else class="mt-1 text-3xl font-bold tracking-tight text-gray-900">&mdash;</p>
                    <UseClipboard v-slot="{ copy, copied }" :source="walletStore.wallet.data?.walletNumber ?? walletStore.subscription.data?.walletNumber">
                      <p class="mt-2 flex items-center gap-x-1.5 text-sm text-gray-500">
                        <span class="tracking-widest">{{ walletStore.wallet.data?.walletNumber ?? walletStore.subscription.data?.walletNumber }}</span>
                        <button @click="copy()" type="button" class="cursor-pointer text-gray-400 hover:text-gray-600" aria-label="Copy wallet number">
                          <ClipboardIcon class="size-4" aria-hidden="true" />
                        </button>
                        <span v-if="copied" class="text-xs text-green-600">Copied!</span>
                      </p>
                    </UseClipboard>
                  </div>
                  <div class="flex shrink-0 flex-col gap-2 sm:items-end">
                    <button type="button" @click="addMoney" class="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 cursor-pointer">
                      <PlusIcon class="size-5" aria-hidden="true" />
                      Add money
                    </button>
                    <router-link :to="{name: 'dashboard'}" class="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50">Send money</router-link>
                  </div>
                </div>
              </div>

              <PendingTopUps v-if="pendingTopups.length > 0" v-bind:topups="pendingTopups" v-on:view="viewTopup" v-on:cancelled="refreshTopups" />

              <div class="rounded-lg bg-white border border-gray-100 px-4 py-4 sm:px-6">
                <div class="flex items-center justify-between">
                  <h2 class="text-base font-semibold text-gray-900">Recent movements</h2>
                  <router-link :to="{name: 'walletStatement'}" class="text-sm font-semibold text-brand-600 hover:text-brand-500">View statement &rarr;</router-link>
                </div>
                <template v-if="recentMovements.length > 0">
                  <ul role="list" class="mt-2 divide-y divide-gray-100">
                    <li v-for="movement in recentMovements" :key="movement.data.id" class="flex justify-between gap-x-6 py-4">
                      <MovementListItem v-bind:movement="movement.data" v-bind:niceTime="movement.niceTime" />
                    </li>
                  </ul>
                </template>
                <template v-else>
                  <p class="mt-3 py-6 text-center text-sm text-gray-500">No movements yet — add money to get started.</p>
                </template>
              </div>
            </div>

            <div>
              <div class="rounded-lg bg-white border border-gray-100 p-5">
                <h2 class="text-base font-semibold text-gray-900">Adding money</h2>
                <ol class="mt-3 space-y-3 text-sm text-gray-600">
                  <li class="flex gap-x-3">
                    <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">1</span>
                    <span>Declare the amount you want to add.</span>
                  </li>
                  <li class="flex gap-x-3">
                    <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">2</span>
                    <span>Transfer <span class="font-semibold text-gray-900">exactly that amount</span> from your bank to your named deposit account.</span>
                  </li>
                  <li class="flex gap-x-3">
                    <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">3</span>
                    <span>The money lands in your wallet, ready to spend.</span>
                  </li>
                </ol>
                <p class="mt-4 text-xs text-gray-400">A declaration stays open for 72 hours. A deposit that arrives late or with a different amount isn't lost — our support team takes care of it.</p>
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
