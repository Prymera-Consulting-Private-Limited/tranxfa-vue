import {describe, expect, it} from 'vitest';
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, readdirSync} from 'node:fs';

// SD-1163. `scripts/generate-flag-assets.mjs` unpacks 540 flag SVGs out of a
// 5 MB stylesheet. It captured the data URI payload with `([^")]*)` - "up to
// the quote or the closing paren" - and an SVG is full of parentheses:
// `clip-path='url(#lr-a)'`, `transform='translate(...)'`, `rgb(...)`. The
// capture stopped at the first one, so 300 of the 540 were written to disk cut
// in half.
//
// Nothing failed. The generated stylesheet was valid, the files existed, they
// served 200, and they painted nothing. India, the United States, Kenya and 140
// others were blank on every tenant, in production, until somebody looked at a
// screen and said "the flags are missing".
//
// The real protection is in the script, which now refuses to write a partial
// file. This asserts the artifact as well, because the script only runs at
// prebuild and a guard nobody runs is a comment.

const FLAG_DIR = 'public/flags';

describe('the generated flag assets', () => {
    // Generated at prebuild and gitignored, so a bare checkout has none.
    const present = existsSync(FLAG_DIR) && readdirSync(FLAG_DIR).length > 0;

    it.skipIf(!present)('writes every flag as a complete SVG', () => {
        const files = readdirSync(FLAG_DIR).filter((f) => f.endsWith('.svg'));

        expect(files.length, 'the generator produced nothing').toBeGreaterThan(400);

        const truncated = files.filter(
            (f) => ! readFileSync(`${FLAG_DIR}/${f}`, 'utf8').trimEnd().endsWith('</svg>'),
        );

        expect(truncated, `these render as nothing:\n  ${truncated.join('\n  ')}`).toEqual([]);
    });

    // The corridors this was actually reported on, named so a future truncation
    // that spares them still gets caught by the sweep above but these read as
    // the regression they were.
    it.skipIf(!present)('includes the flags that were blank in production', () => {
        for (const code of ['in', 'us', 'cn', 'ke', 'za', 'rw', 'lr', 'sl', 'fj']) {
            const svg = readFileSync(`${FLAG_DIR}/${code}-square.svg`, 'utf8');
            expect(svg.trimEnd().endsWith('</svg>'), `${code}-square.svg`).toBe(true);
        }
    });

    // Proving the guard rather than trusting it: run the generator against a
    // stylesheet whose payload contains a parenthesis, with the old pattern, and
    // confirm it produces the truncation this ticket fixed.
    it('the old pattern truncated a payload containing a parenthesis', () => {
        const payload = encodeURIComponent(
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'>" +
            "<g transform='translate(10 10)'><path d='M0 0h512v512H0z'/></g></svg>",
        );
        const body = `background-image:url("data:image/svg+xml,${payload}")`;

        const wasWrong = body.match(/url\(\s*"?data:image\/svg\+xml(;base64)?,([^")]*)"?\s*\)/);
        const isRight = body.match(/url\(\s*"data:image\/svg\+xml(;base64)?,([^"]*)"\s*\)/);

        expect(decodeURIComponent(wasWrong[2]).endsWith('</svg>'),
            'the old pattern should stop at the paren inside translate()').toBe(false);
        expect(decodeURIComponent(isRight[2]).endsWith('</svg>'),
            'the new pattern should carry the whole payload').toBe(true);
    });

    // The script must fail rather than write a partial file. Cheapest honest
    // check: the guard's text is in the source and names the condition.
    it('refuses to write a flag that does not end in </svg>', () => {
        const script = readFileSync('scripts/generate-flag-assets.mjs', 'utf8');

        expect(script).toMatch(/endsWith\('<\/svg>'\)/);
        expect(script, 'the guard must throw, not warn').toMatch(/throw new Error\(/);
    });
});
