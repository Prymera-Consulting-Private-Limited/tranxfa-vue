import {describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import QuoteCoupon from '@/models/quote_coupon.js';
import TransactionQuote from '@/models/transaction_quote.js';
import Transaction from '@/models/transaction.js';

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn()}}));

// SD-1037: promotion coupons as the Client API reference documents them,
// behind VITE_COUPONS_ENABLED.

const read = f => readFileSync(f, 'utf8');

describe('the coupon block on a quote', () => {
  it('is parsed from every quote response and null when none', () => {
    const quote = TransactionQuote.getInstance({id: 'q', recipients: [], coupon: {
      code: 'MERRYXMAS', discount_type: 'monetary', info_text: '5 GBP off your transfer fee.', terms_text: 'One use per customer.',
      discount_amount: '2.99', discount_amount_currency_prefixed: 'GBP 2.99', exchange_rate_before_coupon: null, exchange_rate_before_coupon_formatted: null,
    }});
    expect(quote.coupon).toBeInstanceOf(QuoteCoupon);
    expect(quote.coupon.code).toBe('MERRYXMAS');
    expect(quote.coupon.isMonetary).toBe(true);
    expect(quote.coupon.discountAmountCurrencyPrefixed).toBe('GBP 2.99');
    expect(TransactionQuote.getInstance({id: 'q', recipients: []}).coupon).toBeNull();
  });

  it('carries the was/now rate for a better-rate coupon', () => {
    const coupon = QuoteCoupon.getInstance({code: 'RATE', discount_type: 'better-rate', exchange_rate_before_coupon: '1.40', exchange_rate_before_coupon_formatted: '1 GBP = 1.40 EUR'});
    expect(coupon.isBetterRate).toBe(true);
    expect(coupon.exchangeRateBeforeCouponFormatted).toBe('1 GBP = 1.40 EUR');
  });

  it('is read on the transaction as the flat coupon fields', () => {
    const t = Transaction.getInstance({id: 't', created_at: '2026-09-12T00:34:00Z', local_amount: 45, payment_currency: {id: 'EUR', iso_alpha: 'EUR'}, recipient: {id: 'r-1', whole_name: 'Prescott Padilla'}, state: {code: 'PENDING-PAYMENT'}, coupon_discount_amount: '2.99', coupon_discount_amount_currency_prefixed: 'GBP 2.99', exchange_rate_before_coupon: null, exchange_rate_before_coupon_formatted: null});
    expect(t.couponDiscountAmountCurrencyPrefixed).toBe('GBP 2.99');
    expect(t.exchangeRateBeforeCouponFormatted).toBeNull();
  });
});

describe('the coupon endpoints', () => {
  it('validate, apply and remove use the documented paths and body', async () => {
    const axios = (await import('axios')).default;
    const {useCouponUtils} = await import('@/composables/coupon_utils.js');
    const utils = useCouponUtils();
    await utils.validate('q-1', 'merryxmas');
    expect(axios.post).toHaveBeenCalledWith('/client/v1/quote/coupon/validate/q-1', {coupon_code: 'merryxmas'});
    await utils.apply('q-1', 'merryxmas');
    expect(axios.post).toHaveBeenCalledWith('/client/v1/quote/coupon/q-1', {coupon_code: 'merryxmas'});
    await utils.remove('q-1');
    expect(axios.delete).toHaveBeenCalledWith('/client/v1/quote/coupon/q-1');
  });
});

describe('the confirm step', () => {
  const s = read('src/views/Transfer/IndexView.vue');

  it('is behind the env flag and soft-fails with the API wording', () => {
    expect(s).toContain('const hasCoupons = couponsEnabled();');
    expect(s).toContain('<div v-if="hasCoupons"');
    expect(s).toContain("couponFailure.value = response.data?.failure_reason ||");
  });

  it('reprices exclusively from the apply and remove responses', () => {
    expect(s).toMatch(/const response = await couponUtils\.apply\(quote\.data\.id, couponCode\.value\.trim\(\)\);\n\s*replaceQuote\(response\.data\);/);
    expect(s).toMatch(/const response = await couponUtils\.remove\(quote\.data\.id\);\n\s*replaceQuote\(response\.data\);/);
    expect(s).toContain('Remove code');
  });
});

describe('pricing and the receipt', () => {
  it('show the savings line and the was/now rate', () => {
    for (const f of ['src/components/QuoteDisplay.vue', 'src/components/Transaction/Confirm.vue']) {
      const s = read(f);
      expect(s, f).toContain('props.quote.coupon?.isMonetary');
      expect(s, f).toContain('props.quote.coupon?.isBetterRate');
    }
    const receipt = read('src/views/Transaction/ItemView.vue');
    expect(receipt).toContain('transaction.data.couponDiscountAmountCurrencyPrefixed');
    expect(receipt).toContain('transaction.data.exchangeRateBeforeCouponFormatted');
  });
});
