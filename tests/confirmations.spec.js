import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';

// The 2026-09 feedback audit: resends said nothing on success. These guards
// pin the confirmation and the failure line on every code screen.

const read = f => readFileSync(f, 'utf8');

describe('resend says the code was sent', () => {
  const screens = [
    'src/components/Customer/EmailVerification.vue',
    'src/components/Customer/MobileNumberVerification.vue',
    'src/views/MultifactorAuthenticationView.vue',
    'src/views/AuthByOtp.vue',
    'src/components/Wallet/SpendOtpModal.vue',
  ];

  for (const f of screens) {
    it(`${f} confirms and reports failure`, () => {
      const s = read(f);
      expect(s).toMatch(/resentMessage\.value = ["`]We've sent a new code/);
      expect(s).toMatch(/v-if="resentMessage" role="status"/);
      expect(s).toMatch(/resendFailure|resendError/);
    });
  }

  it('never reads e.status on a resend', () => {
    for (const f of screens) expect(read(f), f).not.toMatch(/\be\.status === 403/);
  });
});

describe('small confirmations', () => {
  it('the rejected-document toast says what to do next', () => {
    expect(read('src/components/CustomerLayout.vue')).toContain('Open Account verification to see why and upload it again.');
  });
});
