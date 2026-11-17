import {describe, expect, it} from "vitest";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

function vueFiles(dir = SRC) {
    const out = [];
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...vueFiles(full));
        else if (entry.name.endsWith('.vue')) out.push(full);
    }

    return out;
}

const rel = f => path.relative(SRC, f);
const lines = f => fs.readFileSync(f, 'utf8').split('\n');

describe('button states', () => {
    // cursor-pointer and cursor-not-allowed are both plain classes of equal
    // specificity, so whichever Tailwind emits later wins - and it emits
    // cursor-pointer later. A disabled button was showing a pointer cursor,
    // telling the customer it worked. The disabled: variant carries the
    // :disabled pseudo-class and wins outright.
    it('never puts a bare cursor-not-allowed beside a bare cursor-pointer', () => {
        const offenders = [];
        for (const f of vueFiles()) {
            lines(f).forEach((l, i) => {
                const bareNotAllowed = /(?<!disabled:)cursor-not-allowed/.test(l);
                const barePointer = /(?<!disabled:)cursor-pointer/.test(l);
                if (bareNotAllowed && barePointer) offenders.push(`${rel(f)}:${i + 1}`);
            });
        }

        expect(offenders).toEqual([]);
    });

    // Every hover in this app is one step darker. brand-700 carries white text
    // at 5.47:1; brand-600 is 3.74 and brand-500 is 2.49, so a button that
    // lightens on hover fails WCAG precisely while the pointer is on it.
    it('darkens on hover rather than lightening', () => {
        const offenders = [];
        for (const f of vueFiles()) {
            lines(f).forEach((l, i) => {
                if (/bg-brand-700/.test(l) && /hover:bg-brand-(500|600)\b/.test(l)) offenders.push(`${rel(f)}:${i + 1} bg`);
                if (/text-brand-700/.test(l) && /hover:text-brand-(500|600)\b/.test(l)) offenders.push(`${rel(f)}:${i + 1} text`);
            });
        }

        expect(offenders).toEqual([]);
    });

    // Removing the outline without putting anything back leaves a keyboard user
    // with no idea where they are.
    it('replaces any outline it removes on a button or link', () => {
        const offenders = [];
        for (const f of vueFiles()) {
            lines(f).forEach((l, i) => {
                if (!/\boutline-(none|hidden|0)\b/.test(l)) return;
                if (/focus-visible:/.test(l)) return;
                if (/<(button|a)\b/.test(l)) offenders.push(`${rel(f)}:${i + 1}`);
            });
        }

        expect(offenders).toEqual([]);
    });
});

describe('design scale', () => {
    // 10px sat between rounded-lg and rounded-xl for no reason.
    it('uses no arbitrary border radius', () => {
        const offenders = vueFiles().filter(f => /rounded-\[\d+px\]/.test(fs.readFileSync(f, 'utf8'))).map(rel);

        expect(offenders).toEqual([]);
    });

    // gray-400 on white is 2.60:1 against a 4.5 requirement. It is fine for an
    // icon, which only needs 3, so this checks text rather than everything.
    it('does not use gray-400 for text', () => {
        const iconish = /<[A-Z]\w*Icon\b|<svg\b|\bsize-\d|\bh-\d+ w-\d+\b|pi pi-/;
        const offenders = [];
        for (const f of vueFiles()) {
            lines(f).forEach((l, i) => {
                if (/text-gray-400/.test(l) && !iconish.test(l)) offenders.push(`${rel(f)}:${i + 1}`);
            });
        }

        expect(offenders).toEqual([]);
    });

    // brand-600 as text is 3.74:1. brand-700 is 5.47.
    it('does not use brand-600 for text', () => {
        const iconish = /<[A-Z]\w*Icon\b|<svg\b|\bsize-\d|\bh-\d+ w-\d+\b|pi pi-|focus:ring-brand-600/;
        const offenders = [];
        for (const f of vueFiles()) {
            lines(f).forEach((l, i) => {
                if (/text-brand-600/.test(l) && !iconish.test(l)) offenders.push(`${rel(f)}:${i + 1}`);
            });
        }

        expect(offenders).toEqual([]);
    });
});

describe('accessibility', () => {
    it('declares a document language', () => {
        const html = fs.readFileSync(path.join(SRC, '..', 'index.html'), 'utf8');

        expect(html).toMatch(/<html[^>]*\blang="[a-z]{2}/);
    });

    // No brand-name check here: this repo IS RemitSo, so alt="RemitSo" is
    // correct. On a brand fork it is not, which is why payvel's copy of this
    // spec carries that assertion and this one does not.
    it('gives every logo an alt', () => {
        const missing = [];
        for (const f of vueFiles()) {
            for (const tag of fs.readFileSync(f, 'utf8').match(/<img\b[^>]*images\/logo\.png[^>]*>/g) || []) {
                if (!/\balt=/.test(tag)) missing.push(rel(f));
            }
        }

        expect(missing).toEqual([]);
    });

    // A <label> with no `for` and no wrapping is decoration. A `for` pointing at
    // nothing is worse - it looks associated and is not.
    it.each(['views/SignInView.vue', 'views/SignUpView.vue', 'views/ForgotPasswordView.vue'])(
        '%s associates every label with a field', (file) => {
            const src = fs.readFileSync(path.join(SRC, file), 'utf8');
            const fors = [...src.matchAll(/<label[^>]*\bfor="([^"]+)"/g)].map(m => m[1]);
            const ids = new Set([...src.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));

            expect(fors.length, 'no associated labels at all').toBeGreaterThan(0);
            expect(fors.filter(x => !ids.has(x)), 'label points at no such field').toEqual([]);
        });
});

// Utility classes, not inline styles: the status-colour spec guards the badge
// var() path, this guards the 500-odd `text-danger-500`-shaped classes. Icons are
// excluded on purpose - WCAG asks 3:1 of a non-text glyph, and darkening a star
// rating to body-text contrast only makes it muddy.
describe('status text contrast', () => {
    const css = fs.readFileSync(path.join(SRC, 'assets', 'main.css'), 'utf8');
    const tokens = Object.fromEntries(
        [...css.matchAll(/--color-([a-z]+)-(\d+):\s*(#[0-9a-f]{6})/gi)].map(m => [`${m[1]}-${m[2]}`, m[3]])
    );

    const onWhite = hex => {
        const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
            .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
        const l = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];

        return 1.05 / (l + 0.05);
    };

    const isIcon = line => /<i |pi-|Icon|<svg|svg |aria-hidden/.test(line);

    it('never sets body text to a status step below AA', () => {
        const failures = [];
        for (const f of vueFiles()) {
            lines(f).forEach((line, i) => {
                if (isIcon(line)) return;
                for (const m of line.matchAll(/text-(success|warning|danger|info|neutral)-(\d{2,3})\b/g)) {
                    const hex = tokens[`${m[1]}-${m[2]}`];
                    if (!hex) return failures.push(`${rel(f)}:${i + 1} ${m[0]} - no such token`);
                    const ratio = onWhite(hex);
                    if (ratio < 4.5) failures.push(`${rel(f)}:${i + 1} ${m[0]} is ${ratio.toFixed(2)}:1`);
                }
            });
        }

        expect(failures).toEqual([]);
    });

    // A class Tailwind cannot generate is inert: the element renders in whatever
    // it inherited. Five of these were already shipped, at -900 steps no ramp
    // defined.
    it('only uses semantic steps the ramps define', () => {
        const missing = new Set();
        for (const f of vueFiles()) {
            for (const m of fs.readFileSync(f, 'utf8')
                .matchAll(/-(success|warning|danger|info|neutral)-(\d{2,3})\b/g)) {
                if (!tokens[`${m[1]}-${m[2]}`]) missing.add(`--color-${m[1]}-${m[2]}`);
            }
        }

        expect([...missing]).toEqual([]);
    });
});

describe('type scale and target size', () => {
    // The static class attribute specifically. Without the lookbehind this also
    // matches a `:class` binding, and since bindings usually come first, the
    // buttons that have one were never checked at all - which is how the
    // calculator's submit button kept rounded-md through the pass that was
    // supposed to standardise every radius.
    const EL = /<(?:button|a|RouterLink|router-link)\b[^>]*?(?<![:\w-])class="([^"]*)"/gis;

    // The house style is 14px on 24 and 12px on 20. Tailwind's bare text-sm and
    // text-xs are 20 and 16, so a bare one is not "the default", it is a
    // different line height from every neighbour.
    it('always writes a line height on text-sm and text-xs', () => {
        const offenders = [];
        for (const f of vueFiles()) {
            lines(f).forEach((line, i) => {
                for (const m of line.matchAll(/\btext-(sm|xs)(\/(\d+))?\b/g)) {
                    const want = m[1] === 'sm' ? '6' : '5';
                    if (m[3] !== want) offenders.push(`${rel(f)}:${i + 1} ${m[0]} should be text-${m[1]}/${want}`);
                }
            });
        }

        expect(offenders).toEqual([]);
    });

    // text-sm/6 and leading-5 on one element are two line heights fighting, and
    // leading-* is emitted later, so the sized form loses.
    it('never sets a line height twice on one element', () => {
        const offenders = [];
        for (const f of vueFiles()) {
            lines(f).forEach((line, i) => {
                for (const m of line.matchAll(/class="([^"]*)"/g)) {
                    if (/text-(?:xs|sm|base|lg|xl|\dxl)\/\d+/.test(m[1]) && /\bleading-\S+/.test(m[1])) {
                        offenders.push(`${rel(f)}:${i + 1}`);
                    }
                }
            });
        }

        expect(offenders).toEqual([]);
    });

    // WCAG 2.2 SC 2.5.8. The mobile step indicator's dots were 10px.
    it('gives every pointer target at least 24px', () => {
        const size = token => {
            const m = token.match(/^(?:size|h|w)-([\d.]+)$/);

            return m ? Number(m[1]) * 4 : null;
        };

        const offenders = [];
        for (const f of vueFiles()) {
            const src = fs.readFileSync(f, 'utf8');
            for (const m of src.matchAll(EL)) {
                const pad = m[1].match(/\bp-([\d.]+)\b/);
                const grown = pad ? Number(pad[1]) * 8 : 0;
                const dims = m[1].split(/\s+/).map(size).filter(d => d !== null);
                if (dims.some(d => d + grown < 24)) {
                    offenders.push(`${rel(f)} ${Math.min(...dims) + grown}px`);
                }
            }
        }

        expect(offenders).toEqual([]);
    });

    // A button that is a pill on one screen and a soft rectangle two screens
    // later is the inconsistency. One radius, one type size, for all of them.
    it('gives every primary button the same radius and type size', () => {
        const radii = new Map(), sizes = new Map();
        for (const f of vueFiles()) {
            const src = fs.readFileSync(f, 'utf8');
            for (const m of src.matchAll(EL)) {
                if (!m[1].includes('bg-brand-7')) continue;
                const radius = m[1].match(/\brounded-\S+/);
                const text = m[1].match(/\btext-(?:xs|sm|base|lg|xl)(?:\/\d+)?\b/);
                if (radius) radii.set(radius[0], (radii.get(radius[0]) ?? 0) + 1);
                if (text) sizes.set(text[0], (sizes.get(text[0]) ?? 0) + 1);
            }
        }

        expect(radii.size, `radii in use: ${[...radii.keys()].join(', ')}`).toBe(1);
        expect(sizes.size, `type sizes in use: ${[...sizes.keys()].join(', ')}`).toBe(1);
    });

    // Two elements with the same id is invalid, and when one is the target of an
    // aria-labelledby the wrong name gets announced.
    it('never repeats a static id within a file', () => {
        const offenders = [];
        for (const f of vueFiles()) {
            const seen = new Map();
            for (const m of fs.readFileSync(f, 'utf8').matchAll(/(?<![:\w-])id="([^"{]+)"/g)) {
                seen.set(m[1], (seen.get(m[1]) ?? 0) + 1);
            }
            for (const [id, count] of seen) if (count > 1) offenders.push(`${rel(f)} id="${id}" x${count}`);
        }

        expect(offenders).toEqual([]);
    });
});
