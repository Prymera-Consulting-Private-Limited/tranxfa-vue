import {describe, expect, it} from "vitest";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {semanticScheme, useColorUtils} from "@/composables/color_utils.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(ROOT, 'src', 'assets', 'main.css'), 'utf8');

const SEMANTICS = ['success', 'warning', 'danger', 'info', 'neutral'];

const tokens = Object.fromEntries(
    [...css.matchAll(/--color-([a-z]+)-(\d+):\s*(#[0-9a-f]{6})/gi)].map(m => [`${m[1]}-${m[2]}`, m[3]])
);

function luminance(hex) {
    const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);

    return (hi + 0.05) / (lo + 0.05);
}

// Every (property, step) the badge components actually ask for, read off the
// source rather than restated - so adding a new step to a badge without adding
// the token fails here instead of on a customer's screen.
function requestedSteps() {
    const steps = new Set();
    const walk = dir => {
        for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.vue')) {
                const src = fs.readFileSync(full, 'utf8');
                for (const m of src.matchAll(/getStyleValue\([^,]+,\s*(\d+)\s*\)/g)) steps.add(Number(m[1]));
            }
        }
    };
    walk(path.join(ROOT, 'src'));

    return [...steps].sort((a, b) => a - b);
}

describe('status colour schemes', () => {
    // The API is free to send a palette name we have never seen. It must not be
    // able to produce an unstyled badge by doing so.
    it('maps anything at all onto a semantic ramp', () => {
        const inputs = ['emerald', 'ROSE', ' amber ', 'teal', 'slate', 'primary',
                        'shrubbery', '', null, undefined, 0, 'var(--x)'];

        for (const input of inputs) {
            expect(SEMANTICS, `${JSON.stringify(input)} fell off the map`).toContain(semanticScheme(input));
        }
    });

    it('sends unrecognised schemes to neutral rather than to nothing', () => {
        expect(semanticScheme('shrubbery')).toBe('neutral');
        expect(semanticScheme(null)).toBe('neutral');
    });

    // Success reading as brand chrome is the bug this mapping exists to fix.
    it('never resolves a status to the brand ramp', () => {
        for (const scheme of ['teal', 'sky', 'emerald', 'brand', 'primary']) {
            expect(useColorUtils().getStyleValue(scheme, 700)).not.toMatch(/--color-brand-/);
        }
    });

    it('only ever emits a variable the stylesheet defines', () => {
        const missing = [];
        for (const semantic of SEMANTICS) {
            for (const step of requestedSteps()) {
                if (!tokens[`${semantic}-${step}`]) missing.push(`--color-${semantic}-${step}`);
            }
        }

        expect(missing, 'badges ask for these; main.css does not define them').toEqual([]);
    });

    // The 600 step was the badge foreground and is 3.1:1 on its own 50 background
    // for success and warning - under AA, on the two states most badges are in.
    it('keeps badge text at AA against its own background', () => {
        const failures = [];
        for (const semantic of SEMANTICS) {
            const ratio = contrast(tokens[`${semantic}-700`], tokens[`${semantic}-50`]);
            if (ratio < 4.5) failures.push(`${semantic}: ${ratio.toFixed(2)}:1`);
        }

        expect(failures).toEqual([]);
    });

    // Guarding the tokens alone is not enough: a component can regress by asking
    // for a lower step. This reads the step each foreground property requests.
    it('asks for a foreground step that clears AA on the badge background', () => {
        const steps = new Set();
        const walk = dir => {
            for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) { walk(full); continue; }
                if (!entry.name.endsWith('.vue')) continue;

                const src = fs.readFileSync(full, 'utf8');
                for (const m of src.matchAll(/(?:\bcolor|\bfill):\s*\w+\.getStyleValue\([^,]+,\s*(\d+)\s*\)/g)) {
                    steps.add(Number(m[1]));
                }
            }
        };
        walk(path.join(ROOT, 'src'));

        expect(steps.size, 'no badge foregrounds found - has the markup moved?').toBeGreaterThan(0);

        const failures = [];
        for (const step of steps) {
            for (const semantic of SEMANTICS) {
                const swatch = tokens[`${semantic}-${step}`];
                const ratio = swatch ? contrast(swatch, tokens[`${semantic}-50`]) : 0;
                if (ratio < 4.5) failures.push(`${semantic}-${step} on ${semantic}-50: ${ratio.toFixed(2)}:1`);
            }
        }

        expect(failures).toEqual([]);
    });

    it('keeps the badge dot and border legible as non-text indicators', () => {
        const failures = [];
        for (const semantic of SEMANTICS) {
            const ratio = contrast(tokens[`${semantic}-600`], tokens[`${semantic}-50`]);
            if (ratio < 3) failures.push(`${semantic}: ${ratio.toFixed(2)}:1`);
        }

        expect(failures).toEqual([]);
    });

    // The CI colour gate reads class names, so an inline var() built from a raw
    // palette name walked straight past it. Nothing may reach var() unmapped.
    it('routes every badge colour through the mapping', () => {
        const offenders = [];
        const walk = dir => {
            for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) { walk(full); continue; }
                if (!/\.(vue|js)$/.test(entry.name)) continue;
                if (full.endsWith(path.join('composables', 'color_utils.js'))) continue;

                const src = fs.readFileSync(full, 'utf8');
                if (/var\(--color-/.test(src)) offenders.push(path.relative(ROOT, full));
            }
        };
        walk(path.join(ROOT, 'src'));

        expect(offenders, 'build the variable through useColorUtils, not by hand').toEqual([]);
    });
});
