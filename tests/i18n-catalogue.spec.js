import {describe, expect, it} from 'vitest';
import {createI18n} from 'vue-i18n';
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
  // SD-1113: the sweep could not see a returned sentence, so these two were
  // never listed. They are listed now.
  'src/views/Travel/Hotels/Partials/HotelAvailability.vue',
  'src/views/Travel/Hotels/Partials/HotelCancellationBadge.vue',
  'src/views/Wallet/IndexView.vue',
  'src/views/Wallet/StatementView.vue',
  // SD-1132: the last twenty-five. None held copy - they are shimmers, icons,
  // small inputs and payment state panels - so listing them costs nothing and
  // means the list below can assert it covers every component, instead of
  // quietly covering the ones somebody remembered.
  'src/components/AccountVerification/Provider/Didit.vue',
  'src/components/BrandLogo.vue',
  'src/components/CardShimmer.vue',
  'src/components/InlineFailure.vue',
  'src/components/IsdCodeInput.vue',
  'src/components/ItemDescriptionShimmer.vue',
  'src/components/ModalCloseButton.vue',
  'src/components/MoneyInput.vue',
  'src/components/MoneyInputShimmer.vue',
  'src/components/PageHeadingShimmer.vue',
  'src/components/Payment/State/AwaitingPending.vue',
  'src/components/Payment/State/Failed.vue',
  'src/components/Payment/State/PaymentCompleted.vue',
  'src/components/Payment/State/Processing.vue',
  'src/components/QuoteDisplay.vue',
  'src/components/Spinner.vue',
  'src/components/Transaction/Confirm.vue',
  'src/components/Transaction/ListShimmer.vue',
  'src/components/Wallet/MovementListItem.vue',
  'src/views/Travel/Bookings/Partials/BookingSkeleton.vue',
  'src/views/Travel/Hotels/Partials/EmptyHotels.vue',
  'src/views/Travel/Hotels/Partials/HotelCard.vue',
  'src/views/Travel/Hotels/Partials/HotelDetailSkeleton.vue',
  'src/views/Travel/Hotels/Partials/HotelMealBadge.vue',
  'src/views/Travel/Hotels/Partials/HotelSkeleton.vue',
];

const flatten = (node, prefix = '') =>
  Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'string' ? [prefix + key] : flatten(value, `${prefix}${key}.`));

const KEYS = new Set(flatten(en));

// SD-1132: MIGRATED is a list somebody typed, and every guard below iterates
// it. Two files were missing from it for weeks, so those guards passed while
// never looking at them, and the copy in them was found by correcting a sweep
// instead. A hand-written list needs a discovery arm or it silently covers less
// than it claims - see .claude/skills/fitness-tests.
describe('MIGRATED covers every component', () => {
  const componentsUnder = (dir) => readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return componentsUnder(path);
    return entry.name.endsWith('.vue') ? [path] : [];
  });

  it('leaves no .vue file unaccounted for', () => {
    const listed = new Set(MIGRATED);

    const unaccounted = componentsUnder('src').filter(file => !listed.has(file));

    expect(unaccounted, 'a component in neither MIGRATED nor this list is one nobody is checking')
      .toEqual([]);
  });

  it('lists nothing that no longer exists', () => {
    const present = new Set(componentsUnder('src'));

    const stale = MIGRATED.filter(file => !present.has(file));

    expect(stale, 'MIGRATED names a file that has been deleted or moved').toEqual([]);
  });
});

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

  // SD-1117: the check above excludes any node holding `{` or `}`, so a text
  // node with an interpolation in it was never read at all. That exempted
  // `Pay {{ amount }}` - the button a customer presses to move their money -
  // along with `Welcome {{ name }}` and `Payout in {{ country }}`, and the
  // extractor skipped the same shape, so nothing ever reported them.
  const CONNECTIVE = /^\W*(?:in|on|at|of|to|for|from|via|and|or|by|with|per)\b/i;

  it.each(MIGRATED)('%s spells out no word beside an interpolation', (file) => {
    const source = read(file);
    const template = source
      .replace(/<script\b[\s\S]*?<\/script>/g, '')
      .replace(/<style\b[\s\S]*?<\/style>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    const found = [];
    for (const match of template.matchAll(/>([^<>]*\{\{[^<>]*\}\}[^<>]*)</g)) {
      const text = match[1].replace(/\s+/g, ' ').trim();

      // An interpolation can hold `>` - an arrow function, a comparison - so a
      // match whose braces do not balance is half an expression, not a node.
      const opens = (text.match(/\{\{/g) || []).length;
      const closes = (text.match(/\}\}/g) || []).length;
      if (opens !== closes) continue;

      const own = text.replace(/\{\{.*?\}\}/g, ' ');
      if (!/[A-Za-z]{2,}/.test(own)) continue;

      // A $t call is the migrated form, not copy.
      if (/\$?t\(\s*'/.test(text)) continue;

      // A connective at the very start or end means the sentence continues in
      // the element next door; that is i18n-compose.py's problem, not a bare
      // sentence. One between this node's own interpolations is fine.
      const head = text.slice(0, text.indexOf('{{'));
      const tail = text.slice(text.lastIndexOf('}}') + 2);
      if (CONNECTIVE.test(head.trim()) || CONNECTIVE.test(tail.trim())) continue;

      found.push(text);
    }

    expect(found, `${file} spells out beside an interpolation: ${found.join(' | ')}`).toEqual([]);
  });
});

// SD-1105: copy also hides inside expressions, where neither the extractor nor
// the bare-text guard could see it: `{{ ok ? 'Yes' : 'No' }}`. The sign-in
// button read English in an otherwise Spanish app for exactly this reason.
describe('copy does not hide in an expression', () => {
  const TAILWIND = /^[a-z0-9:/[\]().%!,@-]+$/;
  const UTILITY = /^(?:flex|grid|block|inline|hidden|absolute|relative|fixed|sticky|w|h|min|max|p[xytblr]?|m[xytblr]?|gap|text|bg|border|ring|rounded|shadow|opacity|z|top|left|right|bottom|size|space|divide|justify|items|self|order|col|row|overflow|truncate|whitespace|cursor|transition|duration|ease|animate|group|peer|sr|not|font|leading|tracking|uppercase|underline|antialiased|object|aspect|fill|stroke|from|via|to|backdrop|outline|accent|pointer|select|scale|rotate|translate|origin|list|table|sm|md|lg|xl|hover|focus|active|disabled|first|last|odd|even|dark|print)\b/;
  const MOMENT = /^[DMYHhmsAaZz\W]{3,}$/;
  const ICON = /^(?:pi|fa|bi|mdi)[\s-]/;
  const COMPARED = /(?:[=!]==?\s*|\.(?:includes|startsWith|endsWith|indexOf|split|match)\(\s*)$/;

  const isClassList = (text) => {
    const tokens = text.trim().split(/\s+/);
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

// SD-1109: and copy also hides in a component's script block, as data the
// template renders. The navigation read English on every page for exactly
// this reason: a plain array of names, no text node in sight.
describe('copy does not hide in a script block', () => {
  const IDENTIFIER = /^[A-Z0-9_]+$|^[a-z][\w-]*$/;
  const COMPARED = /(?:[=!]==?\s*|\.(?:includes|startsWith|endsWith|indexOf|split|match)\(\s*|from\s*|require\(\s*)$/;
  // An analytics event name is wiring, not copy: fbq('trackCustom', 'KYCApproved')
  // and fbq('track', 'Purchase', {...}) are names Meta matches on, and translating
  // one stops the conversion being counted without changing a word on screen.
  const WIRING = /\.(?:listen|stopListening|emit|on|off|once)\(\s*$|\$emit\(\s*$|\bt\(\s*$|\b(?:fbq|gtag)\??\.?\(\s*$|\b(?:fbq|gtag)\??\.?\([^)]*,\s*$/;
  // A developer log and a media query are not copy, and neither is anything
  // this codebase tags with a bracketed prefix.
  const NOISE = /console\.\w+\(\s*$|(?:useMediaQuery|matchMedia)\(\s*$/;
  // A default for a missing environment variable is configuration, not copy:
  // translating it would rename the brand. Only an env read counts, so
  // `props.label || 'Continue'` is still caught.
  const ENV_DEFAULT = /import\.meta\.env\.\w+\s*(?:\|\||\?\?)\s*$/;

  const isCopy = (text) => {
    if (text.length < 3 || text.includes('/') || text.includes('@')) return false;
    const tokens = text.trim().split(/\s+/);
    const classy = (tok) => /^[a-z0-9:/[\]().%!,@-]+$/.test(tok);
    if (tokens.length > 1 ? tokens.every(t => classy(t) && (/-|:/.test(t))) : classy(text) && /-|:/.test(text)) {
      return false;                                                  // a class list
    }
    if (/^[DdMYyHhmsSAaZzXxWwEeQGgkTt\W]{3,}$/.test(text)) return false;  // a date format
    if (/^(?:pi|fa|bi|mdi)[\s-]/.test(text)) return false;           // an icon
    if (/^\(\s*(?:min|max|prefers)-/.test(text)) return false;        // a media query
    if (text.startsWith('[')) return false;                          // a tagged log line
    if (text.includes('.') && !text.includes(' ')) return false;     // a key
    if (IDENTIFIER.test(text)) return false;
    if (!text.includes(' ') && /[:_.\-]/.test(text)) return false;   // an event name
    if (!text.includes(' ') && /[a-z][A-Z]/.test(text)) return false; // PascalCase
    if (!/[A-Za-z]{2,}/.test(text)) return false;
    return /[A-Z]/.test(text) || text.includes(' ');
  };

  // defineProps is hoisted above setup(), so a default there cannot call t().
  // Those components resolve their own default with a computed instead.
  const insideCall = (code, index, name) => {
    const open = code.lastIndexOf(`${name}(`, index);
    if (open < 0) return false;
    let depth = 0;
    for (let i = open + name.length; i < code.length; i += 1) {
      if (code[i] === '(') depth += 1;
      else if (code[i] === ')') {
        depth -= 1;
        if (depth === 0) return open < index && index < i;
      }
    }
    return false;
  };


  // Walking the characters, not matching a pattern: in `'+' + code + ' '` a
  // regex happily returns the gap between two strings as though it were copy.
  const stringsIn = (code) => {
    const out = [];
    let i = 0;
    while (i < code.length) {
      const c = code[i];
      if (c === "'" || c === '"' || c === '`') {
        const quote = c;
        const start = i;
        i += 1;
        while (i < code.length) {
          if (code[i] === '\\') { i += 2; continue; }
          if (code[i] === quote) break;
          if (quote !== '`' && code[i] === '\n') break;
          i += 1;
        }
        if (code[i] === quote && quote !== '`') {
          out.push({start, quoted: code.slice(start, i + 1), text: code.slice(start + 1, i)});
        }
        i += 1;
        continue;
      }
      if (c === '/' && code[i + 1] === '/') {
        const nl = code.indexOf('\n', i);
        if (nl < 0) break;
        i = nl;
        continue;
      }
      if (c === '/' && code[i + 1] === '*') {
        const close = code.indexOf('*/', i);
        if (close < 0) break;
        i = close + 2;
        continue;
      }
      i += 1;
    }
    return out;
  };

  it.each(MIGRATED)('%s keeps no sentence in its script', (file) => {
    const source = read(file);
    // Every script block: a component written as <script> plus <script setup>
    // was half scanned while this looked only for the setup block.
    const blocks = [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    if (blocks.length === 0) return;
    const body = blocks.join('\n');

    const found = [];
    for (const {start, quoted, text} of stringsIn(body)) {
      const before = body.slice(Math.max(0, start - 40), start);
      if (COMPARED.test(before) || WIRING.test(before) || NOISE.test(before)) continue;
      if (ENV_DEFAULT.test(before)) continue;
      // A concatenation means a + beside the literal on the same line. These
      // rules used to allow \s* to cross a newline, so `return 'copy'` matched
      // on the n of return and every returned sentence went unseen.
      if (/\+[ \t]*$/.test(before)) continue;
      if (/^[ \t]*\+/.test(body.slice(start + quoted.length, start + quoted.length + 12))) continue;
      if (insideCall(body, start, 'defineProps') || insideCall(body, start, 'defineEmits')) continue;
      if (isCopy(text)) found.push(text);
    }

    expect(found, `${file} keeps copy in its script: ${found.join(', ')}`).toEqual([]);
  });
});

// SD-1112: the guards above prove a key exists and that no literal is left
// behind. Neither proved the caller could reach t, so a file that gained a
// t(...) call without the import threw ReferenceError on any branch no spec
// happened to render - on the dashboard, the wallet, sign-up and the KYC
// toasts, with the suites green over it.
describe('every t() call can reach a t', () => {
  const CALL = /(?<![\w$.])t\(/g;
  const IN_SCOPE = [
    /\bconst\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useI18n\(/,   // a component
    /\bconst\s+t\s*=/,                                   // a module
    /\bfunction\s+t\s*\(/,
    /\bimport\s*\{[^}]*\bt\b[^}]*\}\s*from/,
  ];

  const sourceFiles = (dir) => readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:js|vue)$/.test(entry.name) ? [path] : [];
  });

  it('holds for every file under src', () => {
    const offenders = [];

    for (const file of sourceFiles('src')) {
      const source = read(file);
      // Only a script block runs as code; a template reaches t another way.
      const code = file.endsWith('.vue')
        ? [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n')
        : source;

      if (!code.match(CALL)) continue;
      if (IN_SCOPE.some(pattern => pattern.test(code))) continue;
      offenders.push(file);
    }

    expect(offenders, `these call t() with no t in scope: ${offenders.join(', ')}`).toEqual([]);
  });
});

// SD-1119: a translation is code, not prose. vue-i18n compiles every message,
// and a placeholder name is an identifier: `{document name}` does not compile
// at all - it throws "Unterminated closing brace" and kills the component that
// renders it - while `{country}` where the English says `{commonName}`
// compiles and then never resolves, so the customer reads the literal
// "{country}". Five of the first kind and three of the second reached the
// Xenvia deploy; one of them crashed the recipient page and another sat on the
// card payment screen. Nothing here is about wording, so it holds for every
// locale a brand ships, not only the ones we can read.
describe('every locale compiles and keeps the English placeholders', () => {
  const locales = readdirSync('src/locales')
    .filter(name => name.endsWith('.json'))
    .map(name => [name.replace(/\.json$/, ''), JSON.parse(read(`src/locales/${name}`))]);

  const flat = (node, prefix = '') => Object.entries(node).reduce((out, [key, value]) =>
    Object.assign(out, typeof value === 'string'
      ? {[prefix + key]: value}
      : flat(value, `${prefix}${key}.`)), {});

  const names = text => [...text.matchAll(/\{([^}]*)\}/g)].map(m => m[1]).sort();

  it.each(locales)('%s compiles every message', (locale, messages) => {
    const i18n = createI18n({legacy: false, locale, fallbackLocale: locale, messages: {[locale]: messages}});
    const broken = [];

    for (const [key, text] of Object.entries(flat(messages))) {
      try {
        i18n.global.t(key, {}, {locale});
      } catch (error) {
        broken.push(`${key}: ${text} - ${error.message}`);
      }
    }

    expect(broken, `${locale} holds messages vue-i18n cannot compile:\n  ${broken.join('\n  ')}`).toEqual([]);
  });

  it.each(locales.filter(([locale]) => locale !== 'en'))('%s keeps the English placeholder names', (locale, messages) => {
    const english = flat(en);
    const wrong = [];

    for (const [key, text] of Object.entries(flat(messages))) {
      if (!(key in english)) continue;
      const want = names(english[key]);
      const have = names(text);
      if (want.join('|') !== have.join('|')) {
        wrong.push(`${key}: en has {${want.join('} {')}}, ${locale} has {${have.join('} {')}}`);
      }
    }

    expect(wrong, `${locale} renames placeholders, so they never resolve:\n  ${wrong.join('\n  ')}`).toEqual([]);
  });
});

// SD-1141. `travel.*` and `wallet.*` belong to products the licence can switch
// off (SD-1074). When it does, those screens are unreachable and their
// translations stop being worth commissioning - which is fine until a screen
// that IS reachable borrows a key from one of them.
//
// QuoteDisplay.vue did exactly that: it labelled the transfer wizard's quote
// summary with `travel.destination` and `wallet.amount`. On Xenvia the licence
// returns no products at all, so those two namespaces were untranslated on
// purpose - and a customer sending money read "Destination" and "Amount" in
// English on the last screen before paying. Found by walking the deployed app;
// no count of translated keys could have shown it.
describe('a reachable screen does not borrow copy from a product namespace', () => {
  const PRODUCT_NAMESPACES = ['travel', 'wallet'];

  // Where each product's own screens live. A file under one of these may of
  // course use its own namespace.
  const OWNS = {
    travel: [/^src\/views\/Travel\//],
    wallet: [/^src\/views\/Wallet\//, /^src\/components\/Wallet\//],
  };

  const filesUnder = (dir) => readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return filesUnder(path);
    return /\.(vue|js)$/.test(entry.name) ? [path] : [];
  });

  it.each(PRODUCT_NAMESPACES)('%s keys are only asked for by that product', (namespace) => {
    const asks = new RegExp(`(?<![\\w$.])\\$?t\\(\\s*'${namespace}\\.`);
    const owns = OWNS[namespace];

    const borrowers = filesUnder('src')
      .filter(file => ! file.startsWith('src/locales/'))
      .filter(file => ! owns.some(pattern => pattern.test(file)))
      .filter(file => asks.test(read(file)));

    expect(borrowers, `these are reachable when ${namespace} is unlicensed, and would read English:\n  ${borrowers.join('\n  ')}`)
      .toEqual([]);
  });
});

// SD-1179. vue-select's `label` prop names WHICH PROPERTY of an option to show
// and to search. It is not copy. The i18n sweep read it as copy anyway and moved
// six of them into the catalogue, so `transfer.wizard.title` existed only to hold
// the literal string "title", and `account.demonym` only to hold "demonym".
//
// In English that round-trips and nothing looks wrong, which is why it survived.
// In any other locale a translator is handed the bare word "title" with no
// context; the moment one translates it the dropdown resolves a property that
// does not exist, every option renders blank, and a required field cannot be
// filled. Xenvia's Spanish catalogue carried both entries untranslated - one
// edit away from it.
describe('a dropdown reads its property name, not the catalogue', () => {
  const under = (dir) => readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return under(path);
    return /\.(vue|js)$/.test(entry.name) ? [path] : [];
  });

  it('no v-select takes its label from a translation call', () => {
    const offenders = under('src').filter(file => (read(file).match(/<v-select\b[^>]*/gis) ?? [])
      .some(tag => /(?::|v-bind:)label\s*=\s*"[^"]*\bt\(/.test(tag)));

    expect(offenders, `label names a property of the option, so a translated one resolves to nothing:\n  ${offenders.join('\n  ')}`)
      .toEqual([]);
  });

  // The discovery arm above only proves nothing is wrong today. This one proves
  // the properties it names are real, so a renamed model field is caught too.
  it('the properties those dropdowns name exist on what they are given', async () => {
    const [{default: Relationship}, {default: Country}] = await Promise.all([
      import('@/models/relationship.js'),
      import('@/models/country.js'),
    ]);

    expect(Relationship.getInstance({id: 'r', title: 'Parent'}).title).toBe('Parent');
    expect(Country.getInstance({id: 'c', demonym: 'Australian, Australia'}).demonym).toBe('Australian, Australia');
  });

  it('has no catalogue entry left whose whole value is a property name', () => {
    expect(en.transfer.wizard.title).toBeUndefined();
    expect(en.account.demonym).toBeUndefined();
  });
});

// SD-1193. The transfer summary built one of its labels like this:
//
//     label: ( quote.recipient?.wholeName || t('recipient.recipient') ) + ' Gets',
//
// A hardcoded English word concatenated onto a name. On Xenvia that rendered
// "Beneficiario Gets" - a Spanish word beside an English one - on the last
// screen before the customer pays. A translated key for the whole sentence
// already existed and was going unused.
//
// Neither guard above could see it. The migration check looks for bare literals
// in templates; the namespace check looks at which keys a t() call asks for.
// Copy welded on with `+` is neither: it never reaches the catalogue at all, so
// there is nothing for a translator to translate and nothing to notice missing.
//
// Two whole sentences joined by a space are fine - a translator gets both, and
// each can be reordered inside itself. What this forbids is a fragment that
// only exists in the source.
describe('copy is never welded onto a translation', () => {
  const under = (dir) => readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return under(path);
    return /\.(vue|js)$/.test(entry.name) ? [path] : [];
  });

  // A quoted literal concatenated onto a t() call, on either side of the `+`.
  const WELDED = [
    /t\([^()]*\)\s*\)?\s*\+\s*['"][^'"]*[A-Za-z]{2}/,
    /['"][^'"]*[A-Za-z]{2}[^'"]*['"]\s*\+\s*\$?t\(/,
  ];

  it('no label or message concatenates a literal onto a t() call', () => {
    const offenders = under('src')
      .filter(file => ! file.startsWith('src/locales/'))
      .filter(file => WELDED.some(pattern => pattern.test(read(file))));

    expect(offenders, `copy welded on with + never reaches the catalogue, so it stays English in every locale:\n  ${offenders.join('\n  ')}`)
      .toEqual([]);
  });

  // The concatenation above is gone only because the key it should have used
  // already existed. Prove it still does, and still carries the placeholder.
  it('the whole-sentence key that replaced it is still there', () => {
    expect(en.calculator.recipientGets).toBe('{recipient} Gets');
    expect(en.calculator.couponCode).toBe('Coupon {code}');
    expect(en.account.spendOrWithdrawTheBalance).toBeTruthy();
    expect(en.transfer.wizard.changeTheAmountAndConfirm).toBeTruthy();
  });
});

// A placeholder written as a prop default never reaches the catalogue:
//
//     placeholder: { type: String, default: 'Please Select' }
//
// A default is evaluated before any locale is in play, so there is no moment at
// which it could be translated. Nine dropdowns carried one - four as a prop
// default, five as a literal in the template - and every one of them read
// "Please Select" in Spanish, on forms a customer has to fill in to send money.
//
// Neither earlier guard sees this. The migration check looks for bare text
// between tags; the welded-copy check looks for a literal concatenated onto a
// t() call. This is a third shape: copy sitting in a JavaScript default, which
// is neither.
describe('copy is never written as a prop default', () => {
  const under = (dir) => readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return under(path);
    return /\.(vue|js)$/.test(entry.name) ? [path] : [];
  });

  // A default whose value is a quoted string of real words. Single characters,
  // codes and empty strings are not copy, so two letters and a space is the bar.
  const COPY_DEFAULT = /default:\s*['"][A-Za-z][A-Za-z]+ [A-Za-z]/;

  it('no prop default holds a sentence a customer reads', () => {
    const offenders = under('src')
      .filter(file => ! file.startsWith('src/locales/'))
      .filter(file => COPY_DEFAULT.test(read(file)));

    expect(offenders, `a prop default cannot be translated - it is evaluated before the locale exists:\n  ${offenders.join('\n  ')}`)
      .toEqual([]);
  });

  it('the placeholder they share is one catalogue key', () => {
    expect(en.common.pleaseSelect).toBe('Please Select');
    expect(en.calculator.pleaseSelect, 'the duplicate under calculator is gone').toBeUndefined();
  });
});

// SD-1212: a sixth shape. Copy written as a template literal in script and
// handed to a template through an object property:
//
//     label: `Coupon ${props.quote.coupon.code}`,
//
// Confirm.vue carried that on the money path while QuoteDisplay rendered the
// same row through the catalogue, so a Spanish customer with a coupon read
// "Cupón X" on one screen and "Coupon X" on the next. It is none of the shapes
// above: not bare text between tags, not a literal welded onto t(), not a prop
// default, not two translations glued together. The guard for script-block
// copy looks for quoted strings, and a backtick with an interpolation inside
// is neither a quoted string nor a mustache.
describe('copy is never a template literal handed to the template', () => {
  const under = (dir) => readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return under(path);
    return /\.(vue|js)$/.test(entry.name) ? [path] : [];
  });

  // A property a template prints, assigned a backtick string in which a word
  // of real letters is followed by a space - "Coupon ${code}", "Room ${n}".
  // The first draft of this demanded two words and walked straight past the
  // very line it was written for, because the second "word" there is an
  // interpolation. A lone interpolation, a code or a URL built from parts has
  // no word-then-space and does not match.
  const LITERAL_COPY = /\b(?:label|title|text|message|description|placeholder):\s*`[^`\n]*\b[A-Za-z]{2,} [^`\n]*`/;

  it('no label, title, text or message is built as a template literal', () => {
    const offenders = under('src')
      .filter(file => ! file.startsWith('src/locales/'))
      .map(file => ({file, line: read(file).split('\n').findIndex(l => LITERAL_COPY.test(l)) + 1}))
      .filter(({line}) => line > 0)
      .map(({file, line}) => `${file}:${line}`);

    expect(offenders, `a template literal in script is never translated - read the catalogue with t() and interpolate there:\n  ${offenders.join('\n  ')}`)
      .toEqual([]);
  });

  it('the was-rate row reads one key in both components', () => {
    expect(en.calculator.rateBeforeCouponCode).toBe('Rate before coupon {code}');
    expect(en.account.rateBeforeCouponCode2, 'the duplicate under account is gone').toBeUndefined();
  });
});

// SD-1203: a fifth shape, and the one every guard above is blind to. A sentence
// split across two t() calls renders welded, because the space that joins them
// lives in neither string and not in the template:
//
//   <router-link>{{ $t('calculator.kycVerification') }}</router-link>{{ $t('calculator.isRequiredBeforeYouCan') }}
//   -> "KYC verificationis required before you can send money."
//
// The SD-1186 guard cannot see it: that one looks for a word spelled out beside
// an interpolation, and deliberately skips a text node whose only content is
// interpolations - which is exactly this shape.
//
// Spacing is the visible half. The half that matters is that a translator is
// handed two fragments with nothing saying one follows the other, and in a
// language that puts the link elsewhere in the sentence the split is wrong
// however it is spaced. One `<i18n-t>` with the link as a named slot is the
// shape that survives translation, which is what SD-1117 settled.
describe('a sentence is never split across two translations', () => {
  // Punctuation that follows a word with no space before it. A fragment opening
  // with one of these is a continuation the writer meant to sit flush.
  const FLUSH = /^\s*[,.;:!?)\]}%]/;

  // Two interpolations with nothing between them, or with a single tag and
  // nothing else. The tag may open or close: a sentence that wraps a link welds
  // on both sides of it, `{{ please }}<router-link>{{ contactSupport }}` just as
  // much as `{{ contactSupport }}</router-link>{{ andQuote }}`, and a version of
  // this guard that allowed only the closing tag reported the second weld in
  // PaymentView while walking straight past the first.
  //
  // Whitespace anywhere between the two is what a correctly written pair has, so
  // the pattern tolerates none: `{{ a }} {{ b }}` renders with its space and is
  // fine. `<br>` is excluded for the same reason - it renders a line break, so
  // the two never touch.
  //
  // Both bodies are captured. The first decides whether this is a pair of
  // catalogue reads at all, and an earlier version started at the closing
  // braces, so the first body was never in the match and nothing ever failed.
  // The second interpolation is a lookahead so the match does not consume it.
  // A sentence wrapped around a link welds twice and the two pairs overlap on
  // the middle fragment; consuming it reported the first weld and hid the
  // second, which is half a bug report.
  const ADJACENT = /\{\{([\s\S]*?)\}\}(?:<\/?(?!br\b)[\w.-]+[^>]*>)?(?=\{\{([\s\S]*?)\}\})/g;

  it.each(MIGRATED)('%s does not weld two translations together', (file) => {
    const template = read(file)
      .replace(/<script\b[\s\S]*?<\/script>/g, '')
      .replace(/<style\b[\s\S]*?<\/style>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    const found = [];
    for (const match of template.matchAll(ADJACENT)) {
      const [, first, second] = match;

      // Only a pair of catalogue reads can weld two sentences. `{{ code }}{{ number }}`
      // is a phone number, and wants no space.
      if (! /\$?t\(/.test(first) || ! /\$?t\(/.test(second)) continue;

      // The key names the string, so the string is what decides. A fragment that
      // starts with punctuation is flush on purpose.
      const key = second.match(/['"]([\w.]+)['"]/)?.[1];
      const value = key?.split('.').reduce((cur, seg) => cur?.[seg], en);
      if (typeof value === 'string' && FLUSH.test(value)) continue;

      found.push(`${key ?? second.trim()} follows another translation with no separator`);
    }

    expect(found, `${file} welds two translations:\n  ${found.join('\n  ')}`).toEqual([]);
  });
});
