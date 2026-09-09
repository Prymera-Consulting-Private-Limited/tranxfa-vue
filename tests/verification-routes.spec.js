import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {fixFor, fixForError} from '@/composables/verification_routes.js';

// The back office audited the identity handout: the confirm endpoint can
// answer 412 with sixteen types and the token endpoint with two more. The
// ones a customer can only clear by doing something get a screen, not a
// sentence.

describe('fixFor', () => {
  it('sends an unverified mobile number and an incomplete identity to onboarding', () => {
    for (const type of ['unverified_customer_mobile_number', 'incomplete_customer_identity']) {
      const fix = fixFor(type, '/transfer/q-1');
      expect(fix.route.name).toBe('onboardingWorkflow');
      expect(fix.label).toBe('Complete your details');
      expect(fix.route.query).toEqual({});
    }
  });

  it('sends a missing address to the onboarding flow', () => {
    expect(fixFor('incomplete_customer_address').route.name).toBe('onboardingWorkflow');
  });

  it('has nothing to offer for a refusal the customer cannot act on', () => {
    for (const type of ['blocked_for_sending', 'duplicate_transaction', 'wallet_spending_on_hold', 'payment_amount_collides', undefined]) {
      expect(fixFor(type)).toBeNull();
    }
  });

  it('reads the type off a 412 and ignores every other status', () => {
    expect(fixForError({response: {status: 412, data: {type: 'incomplete_customer_identity'}}})?.route.name).toBe('onboardingWorkflow');
    expect(fixForError({response: {status: 500, data: {type: 'incomplete_customer_identity'}}})).toBeNull();
    expect(fixForError({request: {}})).toBeNull();
    expect(fixForError(undefined)).toBeNull();
  });
});

describe('the verification modal', () => {
  it('offers the fix instead of Try again when the token endpoint answers 412', () => {
    const s = readFileSync('src/components/AccountVerification/DocumentTypeItem.vue', 'utf8');
    expect(s).toContain('sdkFix.value = fixForError(error');
    expect(s).toContain('<button v-if="sdkFix" v-on:click="goToFix"');
  });
});

describe('uploads', () => {
  it('take the object key from the API when it is sent, and derive it otherwise', () => {
    expect(readFileSync('src/components/AccountVerification/MultiFileUpload.vue', 'utf8')).toContain('response.data.object_key ?? new URL(url).pathname');
    expect(readFileSync('src/components/AccountVerification/SingleFileUpload.vue', 'utf8')).toContain('response.data.object_key ?? new URL(response.data.token).pathname');
  });
});

describe('the verification page', () => {
  it('renders a status it does not know with its title rather than an empty card', () => {
    const s = readFileSync('src/views/AccountVerification/IndexView.vue', 'utf8');
    expect(s).toContain('A status this app does not know');
    expect(s).toContain('{{ document.statusTitle || document.statusCode }}');
  });
});
