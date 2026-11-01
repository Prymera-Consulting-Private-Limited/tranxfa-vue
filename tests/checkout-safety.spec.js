import {beforeEach, describe, expect, it, vi} from 'vitest';
import {
  findTransactionForQuote,
  isOutcomeUnknown,
  matchesQuote,
  saveCheckoutDraft,
  takeCheckoutDraft,
} from '@/composables/checkout_safety.js';
import Transaction from '@/models/transaction.js';

// The Client API reference's "Error Handling" page: a confirm or retry that
// timed out or answered 5xx may still have created the transfer, so the
// client re-checks the list before ever retrying. These pin the helper.

const quote = {
  recipient: {id: 'r-1'},
  paymentCurrency: {id: 'EUR'},
  localAmount: 45,
};

const row = (overrides = {}) => ({
  id: 't-1',
  created_at: '2026-09-12T00:34:00Z',
  local_amount: 45,
  payment_currency: {id: 'EUR', iso_alpha: 'EUR'},
  recipient: {id: 'r-1', whole_name: 'Prescott Padilla'},
  state: {code: 'PENDING-PAYMENT'},
  ...overrides,
});

describe('isOutcomeUnknown', () => {
  it('is true when the request was sent and never answered', () => {
    expect(isOutcomeUnknown({request: {}})).toBe(true);
    expect(isOutcomeUnknown({request: {}, code: 'ECONNABORTED'})).toBe(true);
  });

  it('is true on a 5xx, which may have run before failing', () => {
    expect(isOutcomeUnknown({request: {}, response: {status: 500}})).toBe(true);
    expect(isOutcomeUnknown({request: {}, response: {status: 504}})).toBe(true);
  });

  it('is false when the server refused it', () => {
    for (const status of [400, 401, 412, 422, 429]) {
      expect(isOutcomeUnknown({request: {}, response: {status}})).toBe(false);
    }
  });

  it('is false when nothing was ever sent', () => {
    expect(isOutcomeUnknown(new Error('boom'))).toBe(false);
    expect(isOutcomeUnknown(undefined)).toBe(false);
  });
});

describe('matchesQuote', () => {
  const since = Date.parse('2026-09-12T00:33:00Z');

  it('accepts the same recipient, currency and amount created after the attempt', () => {
    expect(matchesQuote(Transaction.getInstance(row()), quote, since)).toBe(true);
  });

  it('rejects another recipient, another amount, or an older transfer', () => {
    expect(matchesQuote(Transaction.getInstance(row({recipient: {id: 'r-2'}})), quote, since)).toBe(false);
    expect(matchesQuote(Transaction.getInstance(row({local_amount: 50})), quote, since)).toBe(false);
    expect(matchesQuote(Transaction.getInstance(row({created_at: '2026-09-11T00:00:00Z'})), quote, since)).toBe(false);
  });
});

describe('findTransactionForQuote', () => {
  it('asks the list for this recipient and returns the transfer the attempt created', async () => {
    const get = vi.fn().mockResolvedValue({data: {data: [row({id: 'other', local_amount: 10}), row()]}});
    const found = await findTransactionForQuote({get}, quote, Date.parse('2026-09-12T00:34:30Z'));

    expect(get).toHaveBeenCalledWith(null, {recipient_id: 'r-1', limit: 5});
    expect(found?.id).toBe('t-1');
  });

  it('returns null when nothing matches', async () => {
    const get = vi.fn().mockResolvedValue({data: {data: [row({local_amount: 10})]}});
    expect(await findTransactionForQuote({get}, quote, Date.now())).toBeNull();
  });

  it('rejects when the list itself cannot be fetched, so the caller stays put', async () => {
    const get = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(findTransactionForQuote({get}, quote, Date.now())).rejects.toThrow('offline');
  });
});

describe('the checkout draft across the MFA round trip', () => {
  beforeEach(() => sessionStorage.clear());

  it('is returned once and then gone', () => {
    saveCheckoutDraft('q-1', {purposeId: 'p-1', paymentMethodId: 'm-1', thirdPartyDeclarationAccepted: true, paymentData: {reference: 'abc'}});
    expect(takeCheckoutDraft('q-1')).toEqual({purposeId: 'p-1', paymentMethodId: 'm-1', thirdPartyDeclarationAccepted: true, paymentData: {reference: 'abc'}});
    expect(takeCheckoutDraft('q-1')).toBeNull();
  });

  it('is keyed by quote, so another transfer does not inherit it', () => {
    saveCheckoutDraft('q-1', {purposeId: 'p-1'});
    expect(takeCheckoutDraft('q-2')).toBeNull();
  });
});
