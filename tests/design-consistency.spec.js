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
