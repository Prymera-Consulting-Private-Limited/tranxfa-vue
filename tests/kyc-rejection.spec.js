import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import KycDocumentStatus from '@/enums/kyc_document_status.js';

// SD-1038: the KYC spec's states and its rule that the way forward from
// rejected or invalidated is a new document.

const read = f => readFileSync(f, 'utf8');

describe('document states', () => {
  it('knows every state the KYC spec lists', () => {
    expect(Object.values(KycDocumentStatus).sort()).toEqual(['approved', 'invalidated', 'pending-verification', 'processing', 'rejected', 'review-required']);
  });
});

describe('the verification page', () => {
  const s = read('src/views/AccountVerification/IndexView.vue');

  it('offers a new upload from a rejected or invalidated document', () => {
    expect(s).toContain('document.statusCode === KycDocumentStatus.REJECTED || document.statusCode === KycDocumentStatus.INVALIDATED');
    expect(s).toMatch(/<router-link v-if="document\.documentCategory\?\.id" :to="\{name: 'categoryView', params: \{category: document\.documentCategory\.id\}\}"/);
    expect(s).toContain('Upload another document');
    expect(s).not.toContain('We were unable to verify your document');
  });

  it('tells review-required apart from a document a provider is still checking', () => {
    expect(s).toContain('is with our compliance team. We will email you when it is done.');
    expect(s).toMatch(/v-else-if="document\.statusCode === KycDocumentStatus\.PENDING_VERIFICATION \|\| document\.statusCode === KycDocumentStatus\.PROCESSING"/);
  });
});

describe('the document-type dialog', () => {
  const s = read('src/components/AccountVerification/DocumentTypeItem.vue');

  it('reads the refreshed profile before closing, so a webhook rejection shows the way forward', () => {
    expect(s).toMatch(/async function sdkFinalStateReached \(\) \{\n[\s\S]*?customerUtils\.refresh\(\)[\s\S]*?KycDocumentStatus\.REJECTED[\s\S]*?await sdkApplicantRejected\(\{reason: ''\}\);/);
  });

  it('accepts a reason from any provider shape', () => {
    expect(s).toContain("|| payload?.reason");
  });
});

describe('the documented upload fields', () => {
  it('are sent when filled and dropped when empty', () => {
    const s = read('src/composables/customer_utils.js');
    expect(s).toContain('async function uploadDocument(documentCategory, documentType, pages = [], details = {})');
    expect(s).toMatch(/if \(value !== null && value !== undefined && value !== ''\) \{\n\s*data\[key\] = value;/);
  });

  it('are asked for on both upload forms', () => {
    for (const f of ['src/components/AccountVerification/MultiFileUpload.vue', 'src/components/AccountVerification/PoiFileUpload.vue']) {
      const s = read(f);
      expect(s, f).toContain('{document_number: documentNumber.value, expiry_date: expiryDate.value}');
      expect(s, f).toContain('v-if="documentType.documentNumberLabel"');
      expect(s, f).toContain('type="date"');
    }
  });
});
