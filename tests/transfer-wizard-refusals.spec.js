import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {fieldlessErrors} from '@/composables/api_utils.js';

// The transfer wizard stored non-field refusals from the confirm step and
// never rendered them, spun forever when a step fetch failed, and said
// nothing while a document was with compliance.

const read = f => readFileSync(f, 'utf8');
const wizard = () => read('src/views/Transfer/IndexView.vue');

describe('confirm refusals that belong to no field', () => {
  it('are picked out by fieldlessErrors', () => {
    const errors = {'payment_data.reference': ['Required.'], recipient: ['This recipient cannot receive AUD.'], quote: ['Rate expired.']};
    expect(fieldlessErrors(errors, 'payment_data.')).toEqual(['This recipient cannot receive AUD.', 'Rate expired.']);
  });

  it('are rendered above the continue button', () => {
    const s = wizard();
    expect(s).toContain("const confirmGeneralErrors = computed(() => fieldlessErrors(confirmFormErrors.value, 'payment_data.'));");
    expect(s).toMatch(/<div v-if="confirmGeneralErrors\.length > 0"[^>]*role="alert"/);
  });
});

describe('step fetches that fail', () => {
  it('choosing a recipient and the post-upload refresh both catch', () => {
    const s = wizard();
    expect(s).toMatch(/quoteUtils\.setRecipient\(props\.id, recipient\)\.then\([\s\S]*?\}\)\.catch\(\(e\) => \{/);
    expect(s).toMatch(/quoteUtils\.getTransferQuote\(props\.id\)\.then\([\s\S]*?\}\)\.catch\(\(e\) => \{/);
  });

  it('the upload-another-document step can be retried', () => {
    const s = wizard();
    expect(s).toContain('function loadPoiCategory()');
    expect(s).toContain('<InlineFailure :message="stepFailure" retryLabel="Try again" @retry="loadPoiCategory"');
  });

  it('copying details from the ID reports failure inside the dialog', () => {
    const s = wizard();
    expect(s).toContain('<li v-if="applyPoiFailure" class="py-2"><InlineFailure :message="applyPoiFailure" /></li>');
    expect(s).not.toMatch(/\.catch\(\(e\) => \{\n\s*console\.error\(e\);\n\s*\}\)/);
  });
});

describe('a document under review', () => {
  it('is named and the customer is told what happens next', () => {
    const s = wizard();
    expect(s).toContain('const documentInReview = computed(');
    expect(s).toContain('Thanks, we have your {{ documentInReview }}.');
    expect(s).toContain('your transfer will carry on from here');
  });

  it('the identity dialog sits above the layout header', () => {
    expect(wizard()).not.toContain('<Dialog class="relative z-10">');
    expect(read('src/components/AccountVerification/DocumentTypeItem.vue')).toContain('<Dialog class="relative z-50" @close="closeSdk">');
  });
});
