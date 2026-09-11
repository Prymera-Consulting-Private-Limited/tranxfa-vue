import {describe, expect, it} from 'vitest';
import {mount} from '@vue/test-utils';
import {readFileSync} from 'node:fs';
import {failureMessage} from '@/composables/api_utils.js';
import InlineFailure from '@/components/InlineFailure.vue';

// The 2026-09 feedback audit found places on the money path where a request
// failed and the customer was told nothing. These tests pin the wording
// helper, the inline component, and the sites that now use them.

const read = f => readFileSync(f, 'utf8');
const response = (status, data = {}) => ({response: {status, data}, request: {}});

describe('failureMessage', () => {
  it('names the connection when nothing came back', () => {
    expect(failureMessage({request: {}}, 'fallback')).toMatch(/internet connection/);
  });

  it('asks the customer to wait on a rate limit', () => {
    expect(failureMessage(response(429), 'fallback')).toMatch(/wait a minute/);
  });

  it('says the session ended on 401 and 419', () => {
    expect(failureMessage(response(401), 'fallback')).toMatch(/sign in again/);
    expect(failureMessage(response(419), 'fallback')).toMatch(/sign in again/);
  });

  it('passes a customer-facing validation message through', () => {
    expect(failureMessage(response(422, {message: 'This recipient already exists.'}), 'fallback')).toBe('This recipient already exists.');
    expect(failureMessage(response(422, {errors: {amount: ['Amount is too small.']}}), 'fallback')).toBe('Amount is too small.');
  });

  it('uses the caller wording on a server error', () => {
    expect(failureMessage(response(500, {message: 'Server Error'}), 'Nothing has moved.')).toBe('Nothing has moved.');
  });

  it('uses the caller wording when there is no error at all', () => {
    expect(failureMessage(undefined, 'Nothing has moved.')).toBe('Nothing has moved.');
  });
});

describe('InlineFailure', () => {
  it('renders nothing without a message', () => {
    expect(mount(InlineFailure, {props: {message: null}}).html()).toBe('<!--v-if-->');
  });

  it('is an alert with an optional retry', async () => {
    const w = mount(InlineFailure, {props: {message: 'It did not work.', retryLabel: 'Try again'}});
    expect(w.attributes('role')).toBe('alert');
    expect(w.text()).toContain('It did not work.');
    await w.get('button').trigger('click');
    expect(w.emitted('retry')).toHaveLength(1);
  });
});

describe('every silent catch on the money path now speaks', () => {
  const sites = {
    'src/components/Calculator.vue': 'saveFailure',
    'src/components/Payment/ManualPayment.vue': 'confirmFailure',
    'src/components/Payment/PagaPayment.vue': 'confirmFailure',
    'src/components/Payment/Monoova.vue': 'confirmFailure',
    'src/components/Payment/Apaylo.vue': 'confirmFailure',
    'src/views/Transfer/PaymentView.vue': 'retryFailure',
    'src/views/Transfer/PaymentCallbackView.vue': 'retryFailure',
    'src/components/Payment/Volume.vue': 'sdkFailure',
    'src/components/Recipient/AttributeCollection.vue': 'saveFailure',
    'src/views/Recipient/ItemView.vue': 'deleteFailure',
    'src/components/DeviceCard.vue': 'signOutFailure',
    'src/components/Customer/CustomerAttributeForm.vue': 'saveFailure',
    'src/components/Customer/MobileNumberInput.vue': 'saveFailure',
    'src/components/Customer/EmailInput.vue': 'saveFailure',
    'src/components/ChangePassword.vue': 'changeFailure',
  };

  for (const [file, ref] of Object.entries(sites)) {
    it(`${file} renders ${ref}`, () => {
      const s = read(file);
      expect(s).toMatch(new RegExp(`<InlineFailure[^>]*:message="${ref}"`));
      // Volume reports the sdk's own failure, which is not an http error.
      if (! file.endsWith('Volume.vue')) expect(s).toContain('failureMessage(');
    });
  }

  it('no longer swallows a failure with console.error alone', () => {
    for (const file of Object.keys(sites)) {
      expect(read(file), file).not.toMatch(/\.catch\(\(e\) => \{\n\s*console\.error\(e\);\n\s*\}\)/);
    }
  });

  it('never dereferences e.response.status without a guard', () => {
    for (const file of Object.keys(sites).concat('src/views/ResetPasswordView.vue', 'src/views/MultifactorAuthenticationView.vue')) {
      expect(read(file), file).not.toMatch(/\be(?:rror)?\.response\.status/);
      expect(read(file), file).not.toMatch(/\be\.status === 422/);
    }
  });
});

describe('sign-in and auth pages', () => {
  it('says something when sign-in fails without a response', () => {
    const s = read('src/views/SignInView.vue');
    expect(s).toContain('getCustomerMessage(e) ?? "We couldn\'t sign you in. Please check your internet connection and try again."');
    expect(s).not.toMatch(/loginError\.value = e\.response\?\.data\?\.message;/);
  });

  it('explains why the customer is on the sign-in page after a password change', () => {
    const s = read('src/views/SignInView.vue');
    expect(s).toContain("referer === 'reset-password'");
    expect(s).toContain("referer === 'change-password'");
  });

  it('shows a forgot-password failure as an error, not as information', () => {
    const s = read('src/views/ForgotPasswordView.vue');
    expect(s).toContain('forgotPasswordError');
    expect(s).toMatch(/v-if="forgotPasswordError"\s*role="alert"/);
    expect(s).not.toMatch(/forgotPasswordMessage\.value = e\.response/);
  });

  it('offers a retry when the password rules fail to load', () => {
    for (const f of ['src/views/SignUpView.vue', 'src/views/ResetPasswordView.vue', 'src/components/ChangePassword.vue']) {
      const s = read(f);
      expect(s, f).toContain('async function loadPolicy()');
      expect(s, f).toContain('v-if="policyFailed"');
    }
  });

  it('does not rethrow on the code screens', () => {
    for (const f of ['src/views/MultifactorAuthenticationView.vue', 'src/views/AuthByOtp.vue']) {
      expect(read(f), f).not.toContain('throw e;');
      expect(read(f), f).toContain("otpError.value = failureMessage(");
    }
  });

  it('sends a refreshed OTP page back to sign-in instead of throwing', () => {
    expect(read('src/views/AuthByOtp.vue')).toMatch(/if \(! country\?\.id \|\| ! number\) \{\n\s*router\.replace\(\{name: 'signIn'\}\)/);
  });

  it('only proceeds past the mobile-number step once the number is saved', () => {
    const s = read('src/components/Customer/MobileNumberInput.vue');
    expect(s).toMatch(/await customerUtils\.updateMobileNumber\(mobile\.country, mobile\.number\);\n\s*emit\('mobileNumberUpdated'\);/);
  });

  it('flattens the email validation bag so the message shows', () => {
    expect(read('src/components/Customer/EmailInput.vue')).toContain('Object.values(e.response.data.errors ?? {}).flat()');
  });

  it('keeps the change-password form on screen while saving', () => {
    const s = read('src/components/ChangePassword.vue');
    expect(s).toContain(':disabled="isSaving"');
    expect(s).not.toMatch(/const changePassword = async \(\) => \{\n\s*isLoading\.value = true;/);
  });

  it('counts the MFA resend against the clock and clears it on unmount', () => {
    const s = read('src/views/MultifactorAuthenticationView.vue');
    expect(s).toContain('const end = Date.now() + 30000;');
    expect(s).toMatch(/onUnmounted\(\(\) => \{\n\s*if \(resendInterval\) \{\n\s*clearInterval\(resendInterval\);/);
    expect(s).not.toContain('p-timeout');
  });
});
