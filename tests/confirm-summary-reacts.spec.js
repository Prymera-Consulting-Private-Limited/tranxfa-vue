import {describe, expect, it} from 'vitest';
import {mount} from '@vue/test-utils';
import {createI18n} from 'vue-i18n';
import en from '@/locales/en.json';
import Confirm from '@/components/Transaction/Confirm.vue';
import TransactionQuote from '@/models/transaction_quote.js';

/**
 * SD-1213: the confirm summary went stale when a coupon repriced the quote.
 *
 * Confirm built its rows as a plain array in setup, from whatever the quote
 * was at mount. The wizard replaces the quote after Apply and Remove Coupon,
 * and nothing re-ran: the box beside the summary said "now AUD = 980 NGN"
 * while the summary still read 975 and the old payout, on the last screen
 * before the customer pays. Reloading fixed it, which is how it was found.
 *
 * The rows are a computed now. This mounts once and swaps the prop the way
 * the wizard does, which is the only way to catch a setup-time snapshot: a
 * test that mounts with the coupon already applied passes against the old
 * code too, and proves nothing.
 */
const i18n = createI18n({legacy: false, locale: 'en', messages: {en}});

const quote = (overrides = {}) => TransactionQuote.getInstance({
  id: 'q-1',
  recipients: [],
  recipient: {id: 'r-1', whole_name: 'Chinelo Dominics', account_detail_hashmap: []},
  payout_country: {id: 'ng', common_name: 'Nigeria'},
  payout_method: {id: 'pm-1', title: 'Bank Transfer'},
  payment_currency: {id: 'aud', iso_alpha: 'AUD'},
  local_amount_currency_prefixed: 'AUD 100.00',
  exchange_rate_formatted: 'AUD = 975 NGN',
  foreign_amount_currency_prefixed: 'NGN 97,500.00',
  base_fees_currency_prefixed: 'AUD 0.00',
  sub_total_amount_currency_prefixed: 'AUD 100.00',
  total_amount_currency_prefixed: 'AUD 100.00',
  ...overrides,
});

const repriced = () => quote({
  exchange_rate_formatted: 'AUD = 980 NGN',
  foreign_amount_currency_prefixed: 'NGN 98,000.00',
  coupon: {code: 'NGNBOOST', discount_type: 'better-rate', exchange_rate_before_coupon: '975', exchange_rate_before_coupon_formatted: 'AUD = 975 NGN'},
});

describe('the confirm summary follows the quote it is given', () => {
  it('shows the repriced rate, payout and the rate-before-coupon row after Apply, and drops them after Remove', async () => {
    const wrapper = mount(Confirm, {props: {quote: quote()}, global: {plugins: [i18n]}});

    expect(wrapper.text()).toContain('AUD = 975 NGN');
    expect(wrapper.text()).toContain('NGN 97,500.00');
    expect(wrapper.text()).not.toContain('NGNBOOST');

    // Apply Coupon: the wizard replaces quote.data with the response.
    await wrapper.setProps({quote: repriced()});

    expect(wrapper.text(), 'the rate row must show the improved rate').toContain('AUD = 980 NGN');
    expect(wrapper.text(), 'the payout must follow the rate').toContain('NGN 98,000.00');
    expect(wrapper.text(), 'the was-side row must appear').toContain('Rate before coupon NGNBOOST');
    expect(wrapper.text()).not.toContain('NGN 97,500.00');

    // Remove Coupon: back to the original pricing.
    await wrapper.setProps({quote: quote()});

    expect(wrapper.text()).toContain('AUD = 975 NGN');
    expect(wrapper.text()).toContain('NGN 97,500.00');
    expect(wrapper.text(), 'the coupon row must go with the coupon').not.toContain('NGNBOOST');
  });
});
