import {describe, expect, it} from 'vitest';
import {readdirSync, readFileSync} from 'node:fs';

// SD-1120: the recipient badge built its background with
// `bg-${cardColor}-500`. Tailwind only generates a class it can read as a
// literal string, so three of the five colours were never in tranxfa's
// stylesheet - and the badge sets text-white, so those recipients got a blank
// circle instead of their initial. Nothing failed: the class name was spelled
// correctly, it simply did not exist.
const sourceFiles = (dir) => readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
  const path = `${dir}/${entry.name}`;
  if (entry.isDirectory()) return sourceFiles(path);
  return /\.(?:js|vue)$/.test(entry.name) ? [path] : [];
});

// bg-, text-, border-, ring-, fill- and friends, with a ${...} where the colour
// or the shade belongs.
const INTERPOLATED = /`[^`]*\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|accent|divide|shadow)-[^`]*\$\{[^`]*`/;

describe('no Tailwind class is assembled at runtime', () => {
  it('holds for every file under src', () => {
    const offenders = [];

    for (const file of sourceFiles('src')) {
      const source = readFileSync(file, 'utf8');
      for (const line of source.split('\n')) {
        // A comment may name the pattern it warns about; only code counts.
        const code = line.trim();
        if (code.startsWith('//') || code.startsWith('*') || code.startsWith('/*')) continue;
        if (INTERPOLATED.test(line)) offenders.push(`${file}: ${code.slice(0, 90)}`);
      }
    }

    expect(offenders, `Tailwind cannot see these, so it never generates them:\n  ${offenders.join('\n  ')}`)
      .toEqual([]);
  });
});
