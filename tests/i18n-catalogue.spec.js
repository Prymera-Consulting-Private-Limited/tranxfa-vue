import {describe, expect, it} from 'vitest';
import {readFileSync, readdirSync} from 'node:fs';
import en from '@/locales/en.json';

// SD-1076: copy moved out of the templates into catalogues. These guards keep
// it out, and keep every key a template asks for answerable.

const read = f => readFileSync(f, 'utf8');

// The files migrated so far. Each slice adds to this list; a file only joins
// once it holds no bare text of its own.
const MIGRATED = [
  'src/App.vue',
  'src/views/NotFoundView.vue',
  'src/views/SignInView.vue',
  'src/views/ForgotPasswordView.vue',
  'src/views/ResetPasswordView.vue',
  // slice 2, the money path
  'src/components/Calculator.vue',
  'src/components/Payment/BelmoneyCard.vue',
  'src/views/Transfer/IndexView.vue',
  'src/views/Transfer/PaymentView.vue',
  'src/views/Transfer/PaymentCallbackView.vue',
  // slice 3, recipients and verification
  'src/components/AccountVerification/AwsRekognitionLivenessCheck.vue',
  'src/components/AccountVerification/CategoryDescription.vue',
  'src/components/AccountVerification/DocumentTypeItem.vue',
  'src/components/AccountVerification/MultiFileUpload.vue',
  'src/components/AccountVerification/PoiFileUpload.vue',
  'src/components/AccountVerification/Provider/Persona.vue',
  'src/components/AccountVerification/Provider/Shufti.vue',
  'src/components/AccountVerification/Provider/Sumsub.vue',
  'src/components/AccountVerification/Provider/System.vue',
  'src/components/AccountVerification/Provider/UpPass.vue',
  'src/components/AccountVerification/SingleFileUpload.vue',
  'src/components/Customer/EmailVerification.vue',
  'src/components/Customer/MobileNumberVerification.vue',
  'src/components/Recipient/AddRecipientCard.vue',
  'src/components/Recipient/AddRecipientWizard.vue',
  'src/components/Recipient/Attribute/AccountNumberInput.vue',
  'src/components/Recipient/Attribute/DeliveryOptionInput.vue',
  'src/components/Recipient/Attribute/EmailInput.vue',
  'src/components/Recipient/Attribute/MobileNumberInput.vue',
  'src/components/Recipient/Attribute/NameInput.vue',
  'src/components/Recipient/Attribute/PhoneNumberInput.vue',
  'src/components/Recipient/Attribute/RelationshipInput.vue',
  'src/components/Recipient/Attribute/SecondNameInput.vue',
  'src/components/Recipient/Attribute/SelectInput.vue',
  'src/components/Recipient/Attribute/SubDeliveryOptionInput.vue',
  'src/components/Recipient/Attribute/TextInput.vue',
  'src/components/Recipient/Attribute/ThirdNameInput.vue',
  'src/components/Recipient/AttributeCollection.vue',
  'src/components/Recipient/PayoutMethodSelection.vue',
  'src/components/Recipient/RecipientCard.vue',
  'src/components/Recipient/RecipientCardShimmer.vue',
  'src/components/Recipient/RecipientTypeSelection.vue',
  'src/components/Recipient/TargetSelection.vue',
  'src/components/Transaction/RecipientListing.vue',
  'src/views/AccountVerification/CategoryView.vue',
  'src/views/AccountVerification/IndexView.vue',
  'src/views/Recipient/IndexView.vue',
  'src/views/Recipient/ItemView.vue',
  // slice 4, sign-up, onboarding and profile
  'src/components/Customer/AddressInformation.vue',
  'src/components/Customer/CustomerAttributeForm.vue',
  'src/components/Customer/EmailInput.vue',
  'src/components/Customer/EmploymentInformation.vue',
  'src/components/Customer/IdentityInformation.vue',
  'src/components/Customer/MobileNumberInput.vue',
  'src/components/Customer/OnboardingFlow.vue',
  'src/components/Customer/OriginCountrySelection.vue',
  'src/components/Customer/Task.vue',
  'src/views/AuthByOtp.vue',
  'src/views/MultifactorAuthenticationView.vue',
  'src/views/OnboardingWorkflowView.vue',
  'src/views/SignUpView.vue',
];

const flatten = (node, prefix = '') =>
  Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'string' ? [prefix + key] : flatten(value, `${prefix}${key}.`));

const KEYS = new Set(flatten(en));

describe('the English catalogue', () => {
  it('is the source language and has no empty entries', () => {
    expect(KEYS.size).toBeGreaterThan(0);
    for (const key of KEYS) {
      const value = key.split('.').reduce((node, part) => node[part], en);
      expect(value.trim(), key).not.toBe('');
    }
  });

  it('ships every locale as its own file, so a brand adds one and changes nothing else', () => {
    const files = readdirSync('src/locales').filter(f => f.endsWith('.json'));
    expect(files).toContain('en.json');
    for (const file of files) {
      expect(() => JSON.parse(read(`src/locales/${file}`)), file).not.toThrow();
    }
  });
});

describe('the migrated files', () => {
  it.each(MIGRATED)('%s asks for keys the catalogue can answer', (file) => {
    const source = read(file);
    // A call, not the tail of a longer name: `emit('sdkInitialized')` ends in
    // `t(` too. A file with no copy of its own asks for nothing, and that is
    // fine; the guard below is what keeps text out of it.
    const used = [
      ...[...source.matchAll(/(?<![\w$.])\$?t\(\s*'([a-zA-Z][\w.]*)'/g)].map(m => m[1]),
      ...[...source.matchAll(/keypath="([a-zA-Z][\w.]*)"/g)].map(m => m[1]),
    ];

    for (const key of used) {
      expect(KEYS.has(key), `${file} asks for ${key}, which the catalogue does not have`).toBe(true);
    }
  });

  // The point of the migration: a brand should never need to edit a template
  // to change a word again.
  it.each(MIGRATED)('%s carries no bare sentence of its own', (file) => {
    const source = read(file);
    const template = source
      .replace(/<script\b[\s\S]*?<\/script>/g, '')
      .replace(/<style\b[\s\S]*?<\/style>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    const bare = [...template.matchAll(/>([^<>{}]+)</g)]
      .map(m => m[1].trim())
      .filter(text => /[A-Za-z]{3,}/.test(text));

    expect(bare, `${file} still spells out: ${bare.join(' | ')}`).toEqual([]);
  });
});
