<script setup>
import {computed, ref} from 'vue';
import moment from 'moment';
import Spinner from '@/components/Spinner.vue';
import {CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, XCircleIcon} from '@heroicons/vue/24/outline';

const props = defineProps({
  /**
   * @type {OrderCancellation|null}
   */
  cancellation: {
    type: Object,
    default: null,
  },

  isCancelling: {
    type: Boolean,
    default: false,
  },

  cancelError: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['cancel']);

// Cancelling is irreversible and costs money, so it is confirmed in place rather
// than fired off the first click.
const isConfirming = ref(false);

const request = computed(() => props.cancellation?.request ?? null);

const quote = computed(() => props.cancellation?.quote ?? null);

// A cancellation that was refused or is still unanswered leaves the room held,
// so only the flag decides — never the presence of a request.
const isCancelled = computed(() => props.cancellation?.isCancelled ?? false);

const requestNote = computed(() => {
  switch (request.value?.state) {
    case 'ACCEPTED':
      return 'The hotel accepted this cancellation and your room has been released.';

    case 'REFUSED':
      return 'The hotel refused this cancellation, so your booking is still live and your room is still held.';

    case 'UNRESOLVED':
      return "We asked the hotel to cancel this booking and haven't had an answer we can act on. We're chasing it — your room is still held in the meantime.";

    default:
      return "We've asked the hotel to cancel this booking and are waiting for their answer.";
  }
});

const requestIcon = computed(() => {
  switch (request.value?.state) {
    case 'ACCEPTED':
      return CheckCircleIcon;

    case 'REFUSED':
      return XCircleIcon;

    default:
      return ClockIcon;
  }
});

const requestClasses = computed(() => {
  switch (request.value?.state) {
    case 'ACCEPTED':
      return 'border-gray-200 bg-gray-50 text-gray-500';

    case 'REFUSED':
      return 'border-red-200 bg-red-50 text-red-600';

    default:
      return 'border-amber-200 bg-amber-50 text-amber-600';
  }
});

// Only a cancellation that actually happened can owe anybody money. A refused or
// unresolved request leaves the booking live, and a refund line against one would
// tell a customer their money is coming back on a stay they are still going on.
const isOwedMoney = computed(() => isCancelled.value && (request.value?.refundOwed?.amount ?? 0) > 0);

const requestedOn = computed(() => {
  return request.value?.requestedAt ? moment(request.value.requestedAt).format('D MMM YYYY, HH:mm') : null;
});
</script>

<template>
  <section v-if="cancellation" class="overflow-hidden rounded-2xl border border-gray-200 bg-white">
    <header class="border-b border-gray-100 px-5 py-4">
      <h2 class="text-sm font-semibold text-gray-900">Cancellation</h2>
    </header>
    <!-- Somebody has asked. Whether the booking is actually gone is the flag's
    answer alone, and three of the four states leave it live. -->
    <div v-if="request" class="p-5">
      <div :class="[requestClasses, 'flex items-start gap-3 rounded-xl border p-4']">
        <component :is="requestIcon" class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-900">{{ request.stateLabel ?? request.state }}</p>
          <p class="mt-1 text-sm text-gray-600">{{ requestNote }}</p>
          <p v-if="requestedOn" class="mt-1.5 text-xs text-gray-400">Requested {{ requestedOn }}</p>
        </div>
      </div>
      <dl v-if="isCancelled" class="mt-4 space-y-2 text-sm">
        <div class="flex items-baseline justify-between gap-3">
          <dt class="text-gray-500">Charged for cancelling</dt>
          <dd class="font-medium text-gray-900 tabular-nums">{{ request.charged.currencyPrefixed }}</dd>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <dt class="text-gray-500">Refund owed to you</dt>
          <dd class="font-medium text-gray-900 tabular-nums">{{ request.refundOwed.currencyPrefixed }}</dd>
        </div>
      </dl>
      <!-- Owed and sent are different questions, and the second is the one a
      customer is actually asking. -->
      <p v-if="isOwedMoney && request.refundSent" class="mt-3 flex items-start gap-1.5 text-sm text-emerald-700">
        <CheckCircleIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Your refund has been sent.
      </p>
      <p v-else-if="isOwedMoney" class="mt-3 flex items-start gap-1.5 text-sm text-gray-500">
        <ClockIcon class="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden="true" />
        Your refund hasn't been sent yet. Some refunds are arranged by hand, so this can take a little longer than the cancellation itself.
      </p>
    </div>
    <!-- Nobody has asked. -->
    <div v-else class="p-5">
      <template v-if="cancellation.canCancelNow && quote">
        <p v-if="quote.isFree" class="flex items-start gap-1.5 text-sm text-emerald-700">
          <CheckCircleIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          This booking can be cancelled free of charge right now.
        </p>
        <p v-else class="text-sm text-gray-600">Cancelling this booking now would cost <span class="font-medium text-gray-900">{{ quote.costsNow.currencyPrefixed }}</span>.</p>
        <dl class="mt-4 space-y-2 text-sm">
          <div class="flex items-baseline justify-between gap-3">
            <dt class="text-gray-500">Cancellation charge</dt>
            <dd class="font-medium text-gray-900 tabular-nums">{{ quote.costsNow.currencyPrefixed }}</dd>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <dt class="text-gray-500">You would get back</dt>
            <dd class="font-medium text-gray-900 tabular-nums">{{ quote.refundNow.currencyPrefixed }}</dd>
          </div>
        </dl>
        <p class="mt-3 text-xs text-gray-400">This changes as your stay approaches, so it is worked out fresh each time you open this page.</p>
        <div v-if="cancelError" class="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <ExclamationTriangleIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{{ cancelError }}</span>
        </div>
        <!-- The hotel has to agree, so this asks rather than announces. -->
        <div v-if="isConfirming" class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p class="text-sm text-gray-700">
            We'll ask the hotel to cancel this booking. They can refuse, in which case your room stays as it is and nothing is charged.
          </p>
          <div class="mt-3 flex flex-col gap-2 sm:flex-row-reverse">
            <button
                type="button"
                :disabled="isCancelling"
                @click="emit('cancel')"
                class="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-0 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              <Spinner v-if="isCancelling" class="size-4" />
              {{ isCancelling ? 'Asking the hotel…' : 'Yes, cancel this booking' }}
            </button>
            <button
                type="button"
                :disabled="isCancelling"
                @click="isConfirming = false"
                class="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:text-gray-900 focus-visible:outline-0"
            >Keep my booking</button>
          </div>
        </div>
        <button
            v-else
            type="button"
            @click="isConfirming = true"
            class="mt-4 cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 focus-visible:outline-0"
        >Cancel this booking</button>
      </template>
      <!-- Either cancelling is not possible or the cost could not be worked out.
      Both arrive as a missing quote, and neither of them means free. -->
      <p v-else class="flex items-start gap-1.5 text-sm text-gray-500">
        <ExclamationTriangleIcon class="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden="true" />
        This booking can't be cancelled online. Get in touch if you need to change it.
      </p>
    </div>
  </section>
</template>
