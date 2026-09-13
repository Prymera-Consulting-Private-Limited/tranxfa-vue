import {describe, expect, it} from 'vitest';
import {createI18n} from 'vue-i18n';
import moment from 'moment';
import 'moment/dist/locale/es';
import en from '@/locales/en.json';
import es from '@/locales/es.json';

// Xenvia only. The brand ships es.json and sets VITE_APP_LOCALE=es, and twice
// now a merge from main has quietly replaced a translated file with main's
// English one - the navigation, and the contact entry that went with it. This
// asserts what a customer actually reads, and keeps a floor under how much of
// the catalogue is translated so a future merge cannot lose ground silently.
describe('the Spanish build', () => {
  const i18n = createI18n({legacy: false, locale: 'es', fallbackLocale: 'en', messages: {en, es}});
  const t = i18n.global.t;

  it('says the navigation in Spanish', () => {
    expect([t('nav.home'), t('nav.wallet'), t('nav.transfers'), t('nav.recipients'),
            t('nav.accountVerification'), t('nav.settings'), t('nav.contact'), t('nav.signOut')])
      .toEqual(['Inicio', 'Monedero', 'Transacciones', 'Beneficiarios',
                'Verificación de cuenta', 'Configuración', 'Contactar con el soporte técnico', 'Cerrar sesión']);
  });

  it('says the payment button in Spanish', () => {
    // The reason for this merge. On the previous deploy this button read
    // "Pay €45.00" on an otherwise Spanish screen - the last control a
    // customer touches before their money moves.
    expect(t('payment.card.payTotalpaymentamountcurrencyprefixed', {totalPaymentAmountCurrencyPrefixed: '€45.00'}))
      .toBe('Pagar €45.00');
    expect(t('account.welcomeCustomer', {name: 'Ana'})).toBe('Hola, Ana');
    expect(t('account.transactionNumber', {transactionNumber: 'UAT-XE-9160110'}))
      .toBe('Transacción n.º UAT-XE-9160110');
    expect(t('account.payoutInCountry', {commonName: 'Venezuela'})).toBe('Pago en Venezuela');
  });

  it('titles the contact page rather than printing its key', () => {
    expect(t('routes.contact')).toBe('Contactar con el soporte técnico');
    expect(t('routes.contact')).not.toBe('routes.contact');
  });

  it('reads dates in Spanish word order', () => {
    moment.locale('es');
    const when = moment('2026-09-12T14:39:00');

    expect(when.format('LLL')).toBe('12 de septiembre de 2026 14:39');
    expect(when.format('ll')).toBe('12 de sep. de 2026');
    expect(when.format('LT')).toBe('14:39');
  });

  it('falls back to English only where the client has not translated yet', () => {
    const flat = (node, prefix = '') => Object.entries(node).reduce((out, [k, v]) =>
      Object.assign(out, typeof v === 'string' ? {[prefix + k]: v} : flat(v, `${prefix}${k}.`)), {});
    const total = Object.keys(flat(en)).length;
    const done = Object.keys(flat(es)).length;

    console.log(`[es] ${done} of ${total} keys translated, ${total - done} fall back to English`);
    expect(done).toBeGreaterThanOrEqual(427);   // 427 of 934 at this merge
  });
});
