import {describe, expect, it} from 'vitest';
import {mount} from '@vue/test-utils';
import {readFileSync} from 'node:fs';
import LoadFailurePanel from '@/components/LoadFailurePanel.vue';

// The 2026-09 feedback audit found loads that either spun forever on failure
// or rendered an empty state ("No transactions yet") over an error. These
// guards pin the catch and the failure branch at each site.

const read = f => readFileSync(f, 'utf8');
const linkStub = {template: '<a><slot /></a>'};

describe('LoadFailurePanel', () => {
  it('offers a retry when asked', async () => {
    const w = mount(LoadFailurePanel, {props: {title: 'Nope', retryLabel: 'Try again'}, global: {stubs: {RouterLink: linkStub}}});
    expect(w.text()).toContain('Nothing on your account has changed');
    await w.get('button').trigger('click');
    expect(w.emitted('retry')).toHaveLength(1);
  });

  it('keeps the stale-link wording when there is nothing to retry', () => {
    const w = mount(LoadFailurePanel, {props: {title: 'Nope'}, global: {stubs: {RouterLink: linkStub}}});
    expect(w.text()).toContain('link may be out of date');
    expect(w.find('button').exists()).toBe(false);
  });
});

describe('lists say when they failed to load instead of looking empty', () => {
  const lists = {
    'src/views/DashboardView.vue': ['transactionsFailure'],
    'src/views/Transaction/IndexView.vue': ['loadFailure'],
    'src/views/Recipient/IndexView.vue': ['loadFailure'],
    'src/views/Wallet/IndexView.vue': ['loadFailure'],
    'src/views/Wallet/StatementView.vue': ['loadFailure'],
    'src/views/DeviceView.vue': ['loadFailure'],
    'src/views/AccountVerification/IndexView.vue': ['loadFailure'],
    'src/views/AccountVerification/CategoryView.vue': ['loadFailure'],
    'src/components/Customer/OriginCountrySelection.vue': ['loadFailure'],
    'src/components/Customer/EmploymentInformation.vue': ['loadFailure'],
  };

  for (const [file, refs] of Object.entries(lists)) {
    it(`${file} renders a retryable failure`, () => {
      const s = read(file);
      for (const ref of refs) {
        expect(s, ref).toMatch(new RegExp(`<LoadFailurePanel[^>]*:message="${ref}"[^>]*retryLabel=|<InlineFailure[^>]*:message="${ref}"[^>]*retryLabel=`));
      }
      expect(s).toContain('logRequestFailure(');
    });
  }

  it('the wallet no longer swallows its three loads', () => {
    expect(read('src/views/Wallet/IndexView.vue')).not.toContain('.catch(() => {})');
  });

  it('the recipient list clears its shimmer in finally, not only on success', () => {
    expect(read('src/views/Recipient/IndexView.vue')).toMatch(/\.finally\(\(\) => \{\n\s*isLoading\.value = false;/);
  });

  it('the device list has a catch', () => {
    expect(read('src/views/DeviceView.vue')).toMatch(/try \{\n\s*response\.value = await customerUtils\.devices\(\);\n\s*\} catch/);
  });
});

describe('wizard steps do not spin forever', () => {
  it('the add-recipient wizard catches every step fetch and offers a retry', () => {
    const s = read('src/components/Recipient/AddRecipientWizard.vue');
    for (const fn of ['fetchPayoutMethods', 'fetchPayoutChannel', 'fetchRelationships']) {
      expect(s).toContain(`async function ${fn}()`);
      expect(s).toContain(`retryLast = ${fn};`);
    }
    expect(s).toContain('<InlineFailure v-else-if="loadFailure" :message="loadFailure" retryLabel="Try again" @retry="retry"');
  });

  it('shows the branch fetch and its failure in the recipient form', () => {
    const s = read('src/components/Recipient/AttributeCollection.vue');
    expect(s).toContain('v-if="isFetchingDeliveryOptions" role="status"');
    expect(s).toContain(':message="deliveryOptionsFailure" retryLabel="Try again"');
  });

  it('the first onboarding step catches the save and the country list', () => {
    const s = read('src/components/Customer/OriginCountrySelection.vue');
    expect(s).toContain('<InlineFailure :message="saveFailure" />');
    expect(s).toMatch(/try \{\n\s*await customerUtils\.updateCountry\(country\);/);
  });

  it('a failed refresh after the provider finishes still leaves the modal', () => {
    expect(read('src/views/AccountVerification/CategoryView.vue')).toContain("await customerUtils.refresh().catch((e) => logRequestFailure(e, 'verification-refresh'));");
  });
});
