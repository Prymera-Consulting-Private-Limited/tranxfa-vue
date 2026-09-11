import {describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createPinia, setActivePinia} from 'pinia';
import {failureMessage, retryAfterSeconds} from '@/composables/api_utils.js';
import {fixFor} from '@/composables/verification_routes.js';
import Customer from '@/models/customer.js';
import Session from '@/models/session.js';
import QuotePendingDocument from '@/models/quote_pending_document.js';
import WalletRefusalType from '@/enums/wallet_refusal_type.js';

// SD-1035: the Client API reference names things the frontend read under
// other names, and documents behaviour the frontend skipped.

const read = f => readFileSync(f, 'utf8');

describe('field names the reference promises', () => {
  it('reads poi_info_check on the customer', () => {
    expect(Customer.getInstance({id: 'c', poi_info_check: 'failed'}).poiInfoCheck).toBe('failed');
    expect(Customer.getInstance({id: 'c'}).poiInfoCheck).toBeNull();
    expect(read('src/models/customer.js')).not.toContain('poi_name_check');
  });

  it('reads token on the session and required on a pending document', () => {
    expect(Session.getInstance({token: 'abc'}).sessionToken).toBe('abc');
    expect(QuotePendingDocument.getInstance({id: 'd', required: true}).isRequired).toBe(true);
  });
});

describe('Retry-After on 429', () => {
  it('is read as seconds or an HTTP date and said in the message', () => {
    expect(retryAfterSeconds({response: {status: 429, headers: {'retry-after': '30'}}})).toBe(30);
    const soon = new Date(Date.now() + 90_000).toUTCString();
    expect(retryAfterSeconds({response: {status: 429, headers: {'retry-after': soon}}})).toBeGreaterThanOrEqual(89);
    expect(retryAfterSeconds({response: {status: 429, headers: {}}})).toBeNull();
    expect(failureMessage({request: {}, response: {status: 429, headers: {'retry-after': '30'}}}, 'x')).toBe('Too many tries. Please wait 30 seconds and try again.');
    expect(failureMessage({request: {}, response: {status: 429, headers: {}}}, 'x')).toMatch(/wait a minute/);
  });
});

describe('a wrong password keeps the return path', () => {
  it('password login opts out of the auth redirect, like mobile login', () => {
    const s = read('src/composables/customer_utils.js');
    expect(s).toMatch(/\/client\/v1\/login', \{\n\s*email: email,\n\s*password: password,\n\s*\}, \{\n\s*skipAuthRedirect: true,/);
  });

  it('the interceptor keeps a redirect the sign-in page already carries', () => {
    expect(read('src/main.js')).toContain("PUBLIC_ROUTES.has(current.name) ? carried : redirectQueryFor(current)");
  });
});

describe('wallet 412s the customer can act on', () => {
  it('wallet_id_verification_required routes to the verification page', () => {
    expect(WalletRefusalType.ID_VERIFICATION_REQUIRED).toBe('wallet_id_verification_required');
    expect(fixFor('wallet_id_verification_required', '/wallet')).toEqual({route: {name: 'accountVerification', query: {redirect: '/wallet'}}, label: 'Verify your identity'});
  });

  it('the top-up flow shows that route, and closing a wallet explains the zero-balance rule', () => {
    const s = read('src/components/Wallet/TopUpFlow.vue');
    expect(s).toContain('generalFix.value = fixForError(e, router.currentRoute.value.fullPath);');
    expect(s).toContain('<router-link v-if="generalFix" :to="generalFix.route"');
    expect(read('src/views/SettingsView.vue')).toContain('WalletRefusalType.BALANCE_MUST_BE_ZERO');
  });
});

describe('composable defects', () => {
  it('getSources replaces the list and returns the request', async () => {
    setActivePinia(createPinia());
    vi.doMock('axios', () => ({default: {get: vi.fn().mockResolvedValue({data: {data: [{id: 'AU', common_name: 'Australia'}]}})}}));
    const {useCountryUtils} = await import('@/composables/country_utils.js');
    const utils = useCountryUtils();
    await utils.getSources();
    await utils.getSources();
    expect(utils.sources.value).toHaveLength(1);
    vi.doUnmock('axios');
  });

  it('relationships are narrowed to the recipient country', () => {
    expect(read('src/composables/resource_utils.js')).toContain("params: countryId ? {country_id: countryId} : {}");
    expect(read('src/components/Recipient/AddRecipientWizard.vue')).toContain('resourceUtils.relationships(recipient.country?.id ?? null)');
  });

  it('a malformed reset link no longer throws before the request', () => {
    expect(read('src/composables/customer_utils.js')).toMatch(/try \{\n\s*decoded = atob\(token\);\n\s*\} catch/);
  });

  it('recipient editing, which called a route that does not exist, is gone', () => {
    expect(read('src/composables/recipient_utils.js')).not.toContain('/recipient/edit/');
    expect(() => read('src/components/Recipient/UpdateAttributeCollection.vue')).toThrow();
  });
});

describe('the Belmoney awaiting state without the flag', () => {
  it('treats PENDING with no payment_url as the provider settling it, and keeps the slow notice', () => {
    const s = read('src/components/Payment/BelmoneyCard.vue');
    expect(s).toMatch(/const isAwaitingConfirmation = computed\(\(\) => \{\n\s*return props\.transaction\.payment\.state\.code === PaymentState\.PENDING\n\s*&& ! props\.transaction\.payment\.paymentUrl;/);
    expect(s).toContain('const isTakingLong = computed(() => isSlow.value);');
  });

  it('offers Apply Info From POI proactively on the verification page', () => {
    const s = read('src/views/AccountVerification/IndexView.vue');
    expect(s).toContain("customerStore.customer.data?.poiInfoCheck === 'failed'");
    expect(s).toContain('Use the details from my ID');
  });
});
