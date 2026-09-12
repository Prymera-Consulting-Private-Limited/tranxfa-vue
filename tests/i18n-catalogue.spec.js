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
    const used = [...source.matchAll(/\$?t\(\s*'([a-zA-Z][\w.]*)'/g)].map(m => m[1]);

    expect(used.length, `${file} uses no keys`).toBeGreaterThan(0);
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
