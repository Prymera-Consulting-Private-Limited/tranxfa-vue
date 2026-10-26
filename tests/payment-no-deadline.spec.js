import {describe, expect, it} from 'vitest';
import {readdirSync, readFileSync} from 'node:fs';

// SD-1821: Xenvia's card checkout told customers they could pay for "un día
// más", worked out from the payment's expires_at. That field is when the
// platform's sweep cancels an attempt nobody paid, not time the customer is
// given, and the window behind it is configuration that changes per provider
// and per installation. A payment is asked for now, and no screen says how
// long the customer has.
const sourceFiles = (dir) => readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
  const path = `${dir}/${entry.name}`;
  if (entry.isDirectory()) return sourceFiles(path);
  return /\.(?:js|vue)$/.test(entry.name) ? [path] : [];
});

const READS_EXPIRY = /\bexpiresAt\b|\bexpires_at\b/;

// Models map the field and are allowed to; nothing else is, unless it is named
// here with the reason.
const MAY_READ_EXPIRY = {
  // A hotel quote's price hold: how long a price is held while the customer
  // checks the details. It is a hold on a price, not time to pay.
  'src/views/Travel/Hotels/HotelQuoteView.vue': 'hotel price hold',
};

// The shapes the removed copy took, in English and in Xenvia's Spanish. It
// cannot catch a deadline put in other words ("you have a day"), nor a figure
// in text the console sends (payment_terms, a bank account's instruction),
// which is the console's.
const DEADLINE_WORDING = /\bpay by \{|\bpay within\b|\bpayable for\b|\bpayment window\b|\b24 ?h\b|\b\d+ ?(?:hours?|horas?)\b|\bexpires \{|\bpagar durante\b|\bplazo de pago\b/i;

const strings = (node, path = '') => (typeof node === 'string'
  ? [[path, node]]
  : Object.entries(node).flatMap(([key, value]) => strings(value, path ? `${path}.${key}` : key)));

describe('no screen gives the customer a time to pay', () => {
  it('reads expires_at only in the models and the named exceptions', () => {
    const offenders = sourceFiles('src')
      .filter(file => ! file.startsWith('src/models/') && ! (file in MAY_READ_EXPIRY))
      .filter(file => READS_EXPIRY.test(readFileSync(file, 'utf8')));

    expect(offenders, `expires_at is the sweep's, not the customer's (SD-1821). Read the payment state instead:\n  ${offenders.join('\n  ')}`)
      .toEqual([]);
  });

  it('names no exception that has stopped reading it', () => {
    const stale = Object.keys(MAY_READ_EXPIRY).filter(file => ! READS_EXPIRY.test(readFileSync(file, 'utf8')));

    expect(stale, 'an exception nobody needs any more only widens the gap').toEqual([]);
  });

  it('has no deadline wording in any catalogue', () => {
    const offenders = readdirSync('src/locales')
      .filter(name => name.endsWith('.json'))
      .flatMap(name => strings(JSON.parse(readFileSync(`src/locales/${name}`, 'utf8')))
        .filter(([, text]) => DEADLINE_WORDING.test(text))
        .map(([key, text]) => `${name} ${key}: ${text}`));

    expect(offenders, `a payment is asked for now, with no time attached (SD-1821):\n  ${offenders.join('\n  ')}`)
      .toEqual([]);
  });
});
