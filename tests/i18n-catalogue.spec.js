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
  // slice 5, dashboard, history, settings and chrome
  'src/components/ChangePassword.vue',
  'src/components/ClientPaymentAccount.vue',
  'src/components/CustomerAttribute/CountryVSelectInput.vue',
  'src/components/CustomerAttribute/DateOfBirthInput.vue',
  'src/components/CustomerAttribute/EarningRangeInput.vue',
  'src/components/CustomerAttribute/FormGroup.vue',
  'src/components/CustomerAttribute/GenderInput.vue',
  'src/components/CustomerAttribute/MobileNumberInput.vue',
  'src/components/CustomerAttribute/NameInput.vue',
  'src/components/CustomerAttribute/NationalityInput.vue',
  'src/components/CustomerAttribute/OccupationInput.vue',
  'src/components/CustomerAttribute/SecondNameInput.vue',
  'src/components/CustomerAttribute/TextInput.vue',
  'src/components/CustomerAttribute/ThirdNameInput.vue',
  'src/components/CustomerLayout.vue',
  'src/components/DeviceCard.vue',
  'src/components/Footer.vue',
  'src/components/Header.vue',
  'src/components/LoadFailurePanel.vue',
  'src/components/Pagination.vue',
  'src/components/ServiceStatusBanner.vue',
  'src/components/Sidebar.vue',
  'src/components/Transaction/ListItem.vue',
  'src/components/Transaction/Progress.vue',
  'src/components/Transaction/StatementRequestModal.vue',
  'src/components/Transaction/Wizard.vue',
  'src/views/DashboardView.vue',
  'src/views/DeviceView.vue',
  'src/views/SettingsView.vue',
  'src/views/Transaction/IndexView.vue',
  'src/views/Transaction/ItemView.vue',
  // slice 6, wallet, the payment adapters and travel
  'src/components/Payment/Apaylo.vue',
  'src/components/Payment/CinetPay.vue',
  'src/components/Payment/Fincode.vue',
  'src/components/Payment/ManualPayment.vue',
  'src/components/Payment/Monoova.vue',
  'src/components/Payment/PagaPayment.vue',
  'src/components/Payment/Pay360.vue',
  'src/components/Payment/PayCross.vue',
  'src/components/Payment/Volume.vue',
  'src/components/Payment/Wallet.vue',
  'src/components/Wallet/DashboardCard.vue',
  'src/components/Wallet/PendingTopUps.vue',
  'src/components/Wallet/SpendOtpModal.vue',
  'src/components/Wallet/TermsModal.vue',
  'src/components/Wallet/TopUpFlow.vue',
  'src/views/Travel/Bookings/IndexView.vue',
  'src/views/Travel/Bookings/ItemView.vue',
  'src/views/Travel/Bookings/Partials/BookingCancellation.vue',
  'src/views/Travel/Bookings/Partials/BookingCard.vue',
  'src/views/Travel/Bookings/Partials/BookingPayments.vue',
  'src/views/Travel/Bookings/Partials/BookingStateBadge.vue',
  'src/views/Travel/Bookings/Partials/VolumePayment.vue',
  'src/views/Travel/Bookings/PaymentStatusView.vue',
  'src/views/Travel/Bookings/PaymentView.vue',
  'src/views/Travel/Hotels/HotelQuoteView.vue',
  'src/views/Travel/Hotels/HotelView.vue',
  'src/views/Travel/Hotels/IndexView.vue',
  'src/views/Travel/Hotels/Partials/GuestContactForm.vue',
  'src/views/Travel/Hotels/Partials/HotelAction.vue',
  'src/views/Travel/Hotels/Partials/HotelAmenities.vue',
  'src/views/Travel/Hotels/Partials/HotelFilters.vue',
  'src/views/Travel/Hotels/Partials/HotelGallery.vue',
  'src/views/Travel/Hotels/Partials/HotelHeading.vue',
  'src/views/Travel/Hotels/Partials/HotelHouseRules.vue',
  'src/views/Travel/Hotels/Partials/HotelImage.vue',
  'src/views/Travel/Hotels/Partials/HotelPagination.vue',
  'src/views/Travel/Hotels/Partials/HotelPrice.vue',
  'src/views/Travel/Hotels/Partials/HotelRating.vue',
  'src/views/Travel/Hotels/Partials/HotelRoomType.vue',
  'src/views/Travel/Hotels/Partials/HotelRooms.vue',
  'src/views/Travel/Hotels/Partials/HotelSort.vue',
  'src/views/Travel/Hotels/Partials/HotelStayCard.vue',
  'src/views/Travel/Hotels/Partials/PriceChangeDialog.vue',
  'src/views/Travel/Hotels/Partials/SearchBar.vue',
  'src/views/Wallet/IndexView.vue',
  'src/views/Wallet/StatementView.vue',
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

// SD-1105: copy also hides inside expressions, where neither the extractor nor
// the bare-text guard could see it: `{{ ok ? 'Yes' : 'No' }}`. The sign-in
// button read English in an otherwise Spanish app for exactly this reason.
describe('copy does not hide in an expression', () => {
  const TAILWIND = /^[a-z0-9:/[\]().%!,-]+$/;
  const UTILITY = /^(?:flex|grid|block|inline|hidden|absolute|relative|fixed|sticky|w|h|min|max|p[xytblr]?|m[xytblr]?|gap|text|bg|border|ring|rounded|shadow|opacity|z|top|left|right|bottom|size|space|divide|justify|items|self|order|col|row|overflow|truncate|whitespace|cursor|transition|duration|ease|animate|group|peer|sr|not|font|leading|tracking|uppercase|underline|antialiased|object|aspect|fill|stroke|from|via|to|backdrop|outline|accent|pointer|select|scale|rotate|translate|origin|list|table|sm|md|lg|xl|hover|focus|active|disabled|first|last|odd|even|dark|print)\b/;
  const MOMENT = /^[DMYHhmsAaZz\W]{3,}$/;
  const ICON = /^(?:pi|fa|bi|mdi)[\s-]/;
  const COMPARED = /(?:[=!]==?\s*|\.(?:includes|startsWith|endsWith|indexOf|split|match)\(\s*)$/;

  const isClassList = (text) => {
    const tokens = text.split(/\s+/);
    if (tokens.length < 2) return TAILWIND.test(text) && UTILITY.test(text);
    return tokens.every(t => TAILWIND.test(t) && (UTILITY.test(t) || t.includes('-') || t.includes(':')));
  };

  const looksLikeCopy = (text) => {
    if (text.length < 3) return false;
    if (isClassList(text) || MOMENT.test(text) || ICON.test(text)) return false;
    if (text.includes('.') && !text.includes(' ')) return false;   // a key or a file
    if (/^[A-Z0-9_]+$/.test(text)) return false;                    // an enum
    if (/^[a-z][\w-]*$/.test(text)) return false;                   // a slug
    if (!/[A-Za-z]{2,}/.test(text)) return false;
    return /[A-Z]/.test(text) || text.includes(' ');
  };

  const literalsIn = (expr) => {
    const out = [];
    const quoted = /'([^'\\\n]{3,200})'|"([^"\\\n]{3,200})"/g;
    let m;
    while ((m = quoted.exec(expr)) !== null) {
      if (COMPARED.test(expr.slice(0, m.index))) continue;
      out.push(m[1] !== undefined ? m[1] : m[2]);
    }
    return out;
  };

  it.each(MIGRATED)('%s spells no sentence inside an expression', (file) => {
    const source = read(file);
    const open = source.match(/^<template[^>]*>/m);
    if (!open) return;
    const body = source.slice(open.index + open[0].length, source.lastIndexOf('\n</template>'));

    const found = [];
    // An expression that already calls $t is not exempt: one branch of a
    // ternary is often migrated while the other is still English, which is
    // exactly how the sign-in button kept saying Continue.
    const stripCalls = (expr) => expr.replace(/\$?t\(\s*(?:'[^']*'|"[^"]*")\s*(?:,[^()]*)?\)/g, ' ');
    for (const [, expr] of body.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
      found.push(...literalsIn(stripCalls(expr)).filter(looksLikeCopy));
    }
    for (const [, expr] of body.matchAll(/(?::|v-bind:)[\w.-]+="([^"]*)"/g)) {
      found.push(...literalsIn(stripCalls(expr)).filter(looksLikeCopy));
    }

    expect(found, `${file} spells copy inside an expression: ${found.join(', ')}`).toEqual([]);
  });
});
