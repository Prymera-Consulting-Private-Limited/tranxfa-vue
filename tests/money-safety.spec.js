import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';

// Source guards for the three money-safety rules in the Client API reference
// (SD-1034): 412 more_authentication_required mid-checkout, the double-payment
// re-check, and Retry Payment offered from the transfer detail.

const read = f => readFileSync(f, 'utf8');

describe('412 more_authentication_required', () => {
  it('is handled once, in the interceptor, and sends the customer back afterwards', () => {
    const s = read('src/main.js');
    expect(s).toContain("e.response?.data?.type === MFA_REQUIRED_TYPE");
    expect(s).toMatch(/router\.push\(\{ name: 'multiFactorAuth', query: \{ \.\.\.redirectQueryFor\(current\), reason: 'session' \} \}\)/);
    expect(s).toContain("current.name !== 'multiFactorAuth'");
  });

  it('the MFA screen asks for a code when it was reached that way', () => {
    const s = read('src/views/MultifactorAuthenticationView.vue');
    expect(s).toContain("query.reason === 'session'");
    expect(s).toMatch(/if \(isSessionReverify\) \{\n\s*customerUtils\.resendMfaOtp\(\)/);
    expect(s).toContain('nothing you were doing is lost');
  });

  it('the wizard keeps the confirm choices and confirms the same quote again', () => {
    const s = read('src/views/Transfer/IndexView.vue');
    expect(s).toContain('error.response.data.type === MFA_REQUIRED_TYPE');
    expect(s).toContain('saveDraft();');
    expect(s).toContain('const draft = takeCheckoutDraft(props.id);');
    expect(s).toContain("Thanks, you're verified. Check the details and press Confirm");
  });
});

describe('never risk a double payment', () => {
  it('the wizard re-checks the transfers before offering Confirm again', () => {
    const s = read('src/views/Transfer/IndexView.vue');
    expect(s).toMatch(/else if \(isOutcomeUnknown\(error\)\) \{[\s\S]*?outcomeUnknown\.value = true;[\s\S]*?await reconcileOutcome\(\);/);
    expect(s).toContain('findTransactionForQuote(transactionUtils, quote.data, attemptStartedAt');
    expect(s).toMatch(/const showContinueButton = computed\(\(\) => \{\n\s*if \(outcomeUnknown\.value\) return false;/);
    expect(s).not.toContain('Please check your connection and try again.');
  });

  it('the payment page re-reads the transaction and never claims nothing was charged', () => {
    const s = read('src/views/Transfer/PaymentView.vue');
    expect(s).not.toContain('Nothing has been charged. Please try again.');
    expect(s).toMatch(/else if \(isOutcomeUnknown\(e\)\) \{[\s\S]*?transactionUtils\.getTransaction\(props\.id\)/);
    expect(s).toContain("we've refreshed this page");
  });

  it('payment_amount_collides gets its own message and a nudge to change the amount', () => {
    const s = read('src/views/Transfer/IndexView.vue');
    expect(s).toContain('error.response.data.type === "payment_amount_collides"');
    expect(s).toContain('Change the amount and confirm again.');
  });
});

describe('retry from the transfer detail', () => {
  it('offers Retry Payment for FAILED and TIMED-OUT, and links to the payment page', () => {
    const s = read('src/views/Transaction/ItemView.vue');
    expect(s).toContain('code === PaymentState.FAILED || code === PaymentState.TIMED_OUT');
    expect(s).toMatch(/<router-link v-if="canRetryPayment" :to="\{name: 'makePayment', params: \{transactionId: transaction\.data\.id\}\}"/);
  });

  it('the list accepts the documented filters', () => {
    const s = read('src/composables/transaction_utils.js');
    expect(s).toContain('const get = async (page = null, filters = {}) => {');
    expect(s).toContain('...filters,');
  });
});
