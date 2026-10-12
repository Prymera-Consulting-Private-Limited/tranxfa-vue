<script setup>
import {computed} from 'vue';
import OrderNextStepCode from '@/enums/order_next_step_code.js';
import {ArrowRightIcon} from '@heroicons/vue/20/solid';

/**
 * What a booking is waiting on its customer to do, as the console says it
 * (SD-1230). A hotel confirms the room within minutes, before anything is
 * paid, and a customer who is not asked to pay does not pay.
 *
 * Only `pay` is known today. Any other code, or none, renders nothing.
 */
const props = defineProps({
  /**
   * @type {Order}
   */
  order: {
    type: Object,
    required: true,
  },
});

// A payment already waiting holds the customer's deposit account, and starting
// another would be refused. So the button goes to where that one is paid, with
// its account details, and only a booking with nothing waiting goes to the
// method picker.
const destination = computed(() => {
  if (props.order.nextStep?.code !== OrderNextStepCode.PAY) {
    return null;
  }

  return {
    name: props.order.waitingPayment ? 'travelPaymentStatus' : 'travelBookingPayment',
    params: {id: props.order.id},
  };
});
</script>

<template>
  <RouterLink
      v-if="destination"
      :to="destination"
      class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2 text-sm/6 font-semibold text-white shadow-xs transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
  >
    {{ order.nextStep.label ?? $t('travel.payForThisBooking') }}
    <ArrowRightIcon class="size-4" aria-hidden="true" />
  </RouterLink>
</template>
