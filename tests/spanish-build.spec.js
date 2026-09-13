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

  // SD-1141. The walk of the deployed app found the English, not the suite:
  // the count below was comfortably met while the settings cards, the KYC
  // gate, the receipt and the quote summary all still read English. A floor on
  // *how many* keys are translated says nothing about *which*, and the ones
  // that matter are the ones on the way to moving money.
  //
  // These are the exact strings a customer read on staging on 13 Sep 2026.
  it('says the screens on the way to moving money in Spanish', () => {
    // The quote summary in the transfer wizard. QuoteDisplay.vue borrows these
    // two from the travel and wallet namespaces, so they are the only keys of
    // those two that a Xenvia customer can reach - the licence turns both
    // products off. Renaming them belongs on main; translating them does not
    // wait for that.
    expect(t('travel.destination')).toBe('Destino');
    expect(t('wallet.amount')).toBe('Importe');

    // Settings, every action a customer can take from the four cards.
    expect(t('account.modify')).toBe('Modificar');
    expect(t('account.changePassword')).toBe('Cambiar contraseña');
    expect(t('account.manageDevices')).toBe('Administrar dispositivos');
    expect(t('account.saveChanges')).toBe('Guardar cambios');

    // The KYC gate. Nobody sends money before passing it.
    expect(t('verification.oneTimeVerification')).toBe('Verificación única');
    expect(t('verification.verified')).toBe('Verificado');
    expect(t('verification.verificationIntro')).toContain('segura');
    expect(t('verification.documentVerified', {title: 'Pasaporte'}))
      .toBe('Tu Pasaporte se ha verificado correctamente.');

    // The receipt.
    expect(t('account.date')).toBe('Fecha');
    expect(t('account.updatedOn')).toBe('Actualizada el');
    expect(t('account.youSent')).toBe('Tú enviaste');
    expect(t('account.recipientInformation')).toBe('Datos del beneficiario');
    expect(t('account.printReceipt')).toBe('Imprimir recibo');
    expect(t('account.client')).toBe('Cliente');
    expect(t('account.sendingFromCountry', {country: 'España'})).toBe('Enviando desde España');
  });

  // Three of these were wrong rather than missing, which no count would catch.
  it('uses the banking word, the informal register and Spanish spelling', () => {
    // `extracto` is the statement a bank sends; `declaración` is a tax return.
    // The hint above the button already said extracto, so the screen disagreed
    // with itself.
    expect(t('account.downloadStatement')).toBe('Descargar extracto');
    expect(t('account.statementHint')).toContain('Solicita');   // tú, like the rest of the app
    expect(t('account.statementHint')).not.toContain('Solicite');

    // `via` is English (and Latin); Spanish takes the accent.
    expect(t('account.sentAmountViaMethod', {foreignAmountCurrencyPrefixed: 'VES 25.560,00', title: 'Transferencia Bancaria'}))
      .toBe('Enviada VES 25.560,00 vía Transferencia Bancaria');

    // An sr-only heading on the dashboard that literally announced "Section
    // title" to a screen reader. The English still says it; that is main's to
    // fix. Spanish no longer does.
    expect(t('account.sectionTitle')).toBe('Tus transacciones');
  });

  it('falls back to English only where the client has not translated yet', () => {
    const flat = (node, prefix = '') => Object.entries(node).reduce((out, [k, v]) =>
      Object.assign(out, typeof v === 'string' ? {[prefix + k]: v} : flat(v, `${prefix}${k}.`)), {});
    const total = Object.keys(flat(en)).length;
    const done = Object.keys(flat(es)).length;

    console.log(`[es] ${done} of ${total} keys translated, ${total - done} fall back to English`);
    expect(done).toBeGreaterThanOrEqual(461);   // 461 of 950 after SD-1141
  });
});
