import {createI18n} from "vue-i18n";

/**
 * Where the app's words live.
 *
 * Copy used to sit in the templates, so a brand that needed another language
 * edited the templates themselves. That put a hundred files of copy in every
 * brand branch, made each merge from main a conflict, and left the brand's
 * tests asserting a language it no longer spoke. The templates now ask for a
 * key and the catalogue answers.
 *
 * English is the source and the fallback: a key with no translation shows the
 * English rather than the key itself, so a half-translated brand is readable
 * rather than broken. A brand adds its own file to src/locales and sets
 * VITE_APP_LOCALE; nothing else changes.
 */
const catalogues = import.meta.glob('./locales/*.json', {eager: true, import: 'default'});

const messages = Object.fromEntries(
    Object.entries(catalogues).map(([path, catalogue]) => [path.match(/([A-Za-z-]+)\.json$/)[1], catalogue])
);

const requested = String(import.meta.env.VITE_APP_LOCALE ?? 'en').trim().toLowerCase();
const locale = messages[requested] ? requested : 'en';

export default createI18n({
    legacy: false,
    // $t in templates, so a migrated component needs no import of its own.
    globalInjection: true,
    locale,
    fallbackLocale: 'en',
    messages,
    // Silent in production: a missing key must never be a customer's problem.
    missingWarn: import.meta.env.DEV,
    fallbackWarn: import.meta.env.DEV,
});
