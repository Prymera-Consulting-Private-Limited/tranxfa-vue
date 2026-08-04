<script setup>
import {ref} from "vue";
import TransactionQuote from "@/models/transaction_quote.js";
import {useQuoteUtils} from "@/composables/quote_utils.js";
import Spinner from "@/components/Spinner.vue";
import {PercentBadgeIcon} from "@heroicons/vue/24/outline";

const props = defineProps({
  quote: {
    type: TransactionQuote,
    required: true,
  }
})

const emit = defineEmits(['quote:updated']);

const quoteUtils = useQuoteUtils();

const isOpen = ref(false);
const couponCode = ref('');
const isSubmitting = ref(false);
const failureReason = ref('');
const showTerms = ref(false);

const genericFailureReason = 'We could not update your promo code right now. Please try again.';

/**
 * A coupon the customer cannot use is a 422 carrying the reason in `message`.
 * It is an expected outcome, not a fault: show the sentence as the server wrote
 * it and keep what they typed so a typo can be corrected.
 */
const handleFailure = (e) => {
  if (e.response?.status === 422) {
    failureReason.value = e.response.data.message;
  } else {
    failureReason.value = genericFailureReason;
    console.error(e);
  }
}

const applyCoupon = async () => {
  const code = couponCode.value.trim();
  if (! code || isSubmitting.value) {
    return;
  }
  isSubmitting.value = true;
  failureReason.value = '';
  await quoteUtils.applyCoupon(props.quote.id, code).then((response) => {
    emit('quote:updated', response.data);
    couponCode.value = '';
    isOpen.value = false;
  }).catch(handleFailure).finally(() => {
    isSubmitting.value = false;
  });
}

const removeCoupon = async () => {
  if (isSubmitting.value) {
    return;
  }
  isSubmitting.value = true;
  failureReason.value = '';
  await quoteUtils.removeCoupon(props.quote.id).then((response) => {
    emit('quote:updated', response.data);
    showTerms.value = false;
  }).catch(handleFailure).finally(() => {
    isSubmitting.value = false;
  });
}

const startEntering = () => {
  isOpen.value = true;
  failureReason.value = '';
}
</script>

<template>
  <section class="mt-6">
    <!-- Applied. Driven by the quote, never by a local flag, so a coupon the
         server has dropped disappears from here on its own. -->
    <template v-if="quote.coupon">
      <div class="animate-promo-in rounded-md border bg-emerald-50 text-emerald-400 px-4 py-3">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3 min-w-0">
            <PercentBadgeIcon class="h-4.5 w-4.5 shrink-0 mt-0.5 text-emerald-700" aria-hidden="true" />
            <div class="min-w-0">
              <p class="text-sm font-semibold text-emerald-700 break-words">{{ quote.coupon.code }}</p>
              <p v-if="quote.coupon.infoText" class="mt-1 text-xs/5 text-emerald-700 break-words">{{ quote.coupon.infoText }}</p>
              <button
                  v-if="quote.coupon.termsText"
                  type="button"
                  @click="showTerms = !showTerms"
                  class="mt-1 text-xs/5 text-emerald-700 font-semibold hover:underline cursor-pointer"
              >{{ showTerms ? 'Hide T&C' : 'Terms & Conditions' }}</button>
              <p v-if="showTerms && quote.coupon.termsText" class="mt-1 text-xs/5 text-emerald-700 break-words">{{ quote.coupon.termsText }}</p>
            </div>
          </div>
          <button
              type="button"
              @click="removeCoupon"
              :disabled="isSubmitting"
              :class="{'opacity-60': isSubmitting}"
              class="shrink-0 text-sm text-emerald-700 font-semibold hover:underline cursor-pointer"
          >
            <span v-if="isSubmitting" class="flex items-center">
              <Spinner :class="'w-4 h-4 mr-2'" />
              <span>Removing...</span>
            </span>
            <span v-else>Remove</span>
          </button>
        </div>
      </div>
      <p v-if="failureReason" role="alert" class="animate-promo-in mt-2 text-sm text-red-600">{{ failureReason }}</p>
    </template>

    <!-- Idle -->
    <button
        v-else-if="! isOpen"
        type="button"
        @click="startEntering"
        class="text-sm text-brand-700 font-semibold hover:underline cursor-pointer"
    >Have a promo code?</button>

    <!-- Entering / checking / rejected -->
    <form v-else @submit.prevent="applyCoupon">
      <label for="coupon-code" class="text-sm/6 font-semibold text-gray-900">Promo code</label>
      <div class="mt-1 flex items-start gap-3 flex-col sm:flex-row">
        <div class="w-full sm:flex-1">
          <input
              id="coupon-code"
              v-model="couponCode"
              type="text"
              maxlength="255"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              :aria-invalid="failureReason ? 'true' : 'false'"
              :class="failureReason ? 'border-red-500 text-red-600' : 'border-gray-300 text-gray-900'"
              class="block w-full px-3 py-2 border rounded-md shadow-sm uppercase focus:outline-none"
          />
        </div>
        <button
            type="submit"
            :disabled="! couponCode.trim() || isSubmitting"
            :class="{'opacity-60': ! couponCode.trim() || isSubmitting}"
            class="w-full sm:w-auto bg-brand-700 text-white text-center px-5 py-2.5 rounded-[10px] font-medium hover:bg-brand-800 transition cursor-pointer text-sm"
        >
          <span v-if="isSubmitting" class="flex justify-center items-center">
            <Spinner :class="'w-5 h-5 mr-3'" />
            <span>Applying...</span>
          </span>
          <span v-else>Apply</span>
        </button>
      </div>
      <p v-if="failureReason" role="alert" class="animate-promo-in mt-2 text-sm text-red-600">{{ failureReason }}</p>
    </form>
  </section>
</template>
