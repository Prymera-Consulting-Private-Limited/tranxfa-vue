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

describe('uploads say what went wrong', () => {
  it('multi-file rows carry a reason and a retry', () => {
    const s = read('src/components/AccountVerification/MultiFileUpload.vue');
    expect(s).toContain('const uploadFile = async (fileObj) => {');
    expect(s).toContain("fileObj.reason = failureMessage(e, \"We couldn't prepare this file for upload.\");");
    expect(s).toContain('@click="uploadFile(file)"');
    expect(s).toContain('{{ file.name }}: {{ file.reason }}');
    expect(s).toContain('<InlineFailure :message="saveFailure" />');
  });

  it('single-file upload catches the token call', () => {
    const s = read('src/components/AccountVerification/SingleFileUpload.vue');
    expect(s).toMatch(/try \{\n\s*response = await customerUtils\.getAccountVerificationToken/);
    expect(s).not.toContain('Something went wrong. Please try again!');
  });

  it('the front/back upload reports a failed save', () => {
    expect(read('src/components/AccountVerification/PoiFileUpload.vue')).toContain('<InlineFailure :message="saveFailure" />');
  });
});

describe('the redirect providers', () => {
  it('have a Not now that closes the dialog rather than completing it', () => {
    for (const f of ['src/components/AccountVerification/Provider/Shufti.vue', 'src/components/AccountVerification/Provider/UpPass.vue']) {
      const s = read(f);
      expect(s, f).toContain("@click=\"emit('sdkCancelled')\"");
      expect(s, f).not.toMatch(/@click="sdkFinalStateReached"[^>]*>\s*Cancel/);
    }
    const item = read('src/components/AccountVerification/DocumentTypeItem.vue');
    expect(item.match(/v-on:sdkCancelled="closeSdk"/g).length).toBeGreaterThanOrEqual(4);
  });

  it('remove only their own listener so the layout keeps its toasts', () => {
    for (const f of ['src/components/AccountVerification/Provider/Shufti.vue', 'src/components/AccountVerification/Provider/UpPass.vue']) {
      const s = read(f);
      expect(s, f).not.toContain('Echo.leaveChannel(');
      expect(s, f).toContain(".stopListening('CustomerDocumentUploaded', onDocumentUploaded)");
    }
  });
});

describe('small confirmations', () => {
  it('the rejected-document toast says what to do next', () => {
    expect(read('src/components/CustomerLayout.vue')).toContain('Open Account verification to see why and upload it again.');
  });
});
