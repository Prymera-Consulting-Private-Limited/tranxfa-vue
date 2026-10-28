import {describe, expect, it} from 'vitest';
import {readdirSync, readFileSync} from 'node:fs';

// SD-1710: Xenvia's customers save transaction pages as PDF receipts, and
// every one came out with a broken logo. It was not broken. The header shows
// the reversed logo (white lettering) on the brand-coloured bar, that colour
// is a background, and browsers drop backgrounds when printing - so the
// lettering printed white on white and only the coloured mark was left.
//
// The rule: a reversed logo is screen-only (`print:hidden`), and the file that
// shows it also carries the full-colour logo for print (`hidden print:block`).
//
// What this cannot judge: whether a brand's logo.png reads well on paper (it
// is the one the auth screens already show on white, so it should), or how a
// browser lays the page out when printing. The print preview checks those.
const vueFiles = (dir) => readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
  const path = `${dir}/${entry.name}`;
  if (entry.isDirectory()) return vueFiles(path);
  return entry.name.endsWith('.vue') ? [path] : [];
});

const BRAND_LOGO = /<BrandLogo\b[^>]*>/g;

const classesOf = (tag) => (tag.match(/\sclass="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean);

// A bound variant cannot be resolved from the source, so it counts as
// reversed: it has to stay off paper too.
const isReversed = (tag) => /\svariant="light"/.test(tag) || /\s(?::|v-bind:)variant=/.test(tag);

const logos = vueFiles('src').flatMap((file) =>
  [...readFileSync(file, 'utf8').matchAll(BRAND_LOGO)].map(([tag]) => ({file, tag})));

describe('a reversed logo never reaches paper', () => {
  it('finds the logos it is meant to check', () => {
    // An empty scan would pass both arms below.
    expect(logos.length).toBeGreaterThan(0);
  });

  it('hides every reversed logo when printing', () => {
    const offenders = logos
      .filter(({tag}) => isReversed(tag) && !classesOf(tag).includes('print:hidden'))
      .map(({file, tag}) => `${file}: ${tag}`);

    expect(offenders, 'white lettering on paper prints as nothing').toEqual([]);
  });

  it('prints the full-colour logo wherever the reversed one is hidden', () => {
    const printsFullColour = (file) => logos.some(({file: f, tag}) =>
      f === file && !isReversed(tag) && classesOf(tag).includes('hidden') && classesOf(tag).includes('print:block'));

    const missing = [...new Set(logos.filter(({tag}) => isReversed(tag)).map(({file}) => file))]
      .filter((file) => !printsFullColour(file));

    expect(missing, 'hiding the reversed logo alone leaves the printed page with none').toEqual([]);
  });

  it('prints the header bar white, so the full-colour logo lands on white', () => {
    // A browser set to print backgrounds would otherwise put the full-colour
    // logo on the brand colour, the one place it was not designed for.
    const bar = readFileSync('src/components/Header.vue', 'utf8').match(/<Popover\s+as="header"[^>]*>/)?.[0] ?? '';

    expect(bar, 'the header bar was not found').not.toBe('');
    expect(classesOf(bar)).toContain('print:bg-white');
  });
});
