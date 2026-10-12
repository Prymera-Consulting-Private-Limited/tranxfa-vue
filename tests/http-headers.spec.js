import {describe, expect, it} from "vitest";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const yml = fs.readFileSync(path.join(ROOT, 'customHttp.yml'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// customHttp.yml is small and rigidly shaped, and the project has no YAML
// dependency. Reading it with two regexes is cheaper than adding one.
function block(pattern) {
    const start = yml.indexOf(`- pattern: '${pattern}'`);
    if (start < 0) return null;
    const next = yml.indexOf('\n  - pattern:', start + 1);

    return yml.slice(start, next < 0 ? undefined : next);
}

// Walks the header list of one pattern block: comments and blank lines are
// skipped, and a folded `value: >-` collects its continuation lines.
function header(pattern, key) {
    const b = block(pattern);
    if (!b) return null;

    let current = null, value = null;
    for (const line of b.split('\n')) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('#')) continue;

        const k = trimmed.match(/^- key: '(.+)'$/);
        if (k) {
            if (value !== null) break;
            current = k[1];
            continue;
        }
        if (current !== key) continue;

        const v = trimmed.match(/^value: ?(>-|\|-)?\s*(.*)$/);
        if (v) { value = v[2].replace(/^'|'$/g, ''); continue; }
        if (value !== null) value += ' ' + trimmed;
    }

    return value === null ? null : value.replace(/\s+/g, ' ').trim();
}

describe('response headers', () => {
    it('sets every header the staging audit found missing', () => {
        for (const key of ['Strict-Transport-Security', 'X-Content-Type-Options',
                           'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']) {
            expect(header('**', key), `${key} is not set`).toBeTruthy();
        }
    });

    // Serving 540 SVGs makes nosniff load-bearing rather than decorative.
    it('refuses to sniff content types', () => {
        expect(header('**', 'X-Content-Type-Options')).toBe('nosniff');
    });

    // The hashed bundles can be held forever; the document that names them cannot,
    // or a deploy never reaches anyone.
    it('caches fingerprinted assets forever and the entry document never', () => {
        expect(header('/assets/**', 'Cache-Control')).toMatch(/immutable/);
        expect(header('/assets/**', 'Cache-Control')).toMatch(/max-age=31536000/);
        expect(header('/index.html', 'Cache-Control')).toMatch(/no-cache|no-store/);
    });

    const csp = header('**', 'Content-Security-Policy-Report-Only')
        ?? header('**', 'Content-Security-Policy');

    it('locks down the directives that have no legitimate use here', () => {
        expect(csp).toBeTruthy();
        expect(csp).toMatch(/object-src 'none'/);
        expect(csp).toMatch(/base-uri 'self'/);
        expect(csp).toMatch(/frame-ancestors 'self'/);
        // 'wasm-unsafe-eval' is needed by the tfjs liveness backend. Full
        // 'unsafe-eval' is not, and never should be.
        expect(csp.replace(/'wasm-unsafe-eval'/g, '')).not.toMatch(/'unsafe-eval'/);
    });

    // The policy is only as good as its currency. Adding a third-party <script> to
    // index.html without adding its host here is how a CSP quietly starts lying.
    it('names every third-party script host that index.html loads', () => {
        const hosts = [...html.matchAll(/<script[^>]*\ssrc="https:\/\/([a-z0-9.-]+)/g)].map(m => m[1]);
        const inlineHosts = [...html.matchAll(/s1\.src\s*=\s*"https:\/\/([a-z0-9.-]+)/g)].map(m => m[1]);

        const missing = [...new Set([...hosts, ...inlineHosts])].filter(host => {
            const wildcard = host.replace(/^[a-z0-9-]+\./, '*.');

            return !csp.includes(host) && !csp.includes(wildcard);
        });

        expect(missing, 'script hosts absent from the CSP').toEqual([]);
    });

    // The Volume SDK is loaded by script_loader when a Volume payment renders,
    // so no page pays for it up front. The host stays in the CSP for that load.
    it('loads no third-party script on every page', () => {
        expect(html).not.toMatch(/<script[^>]*\ssrc="https:/);
        expect(csp).toContain('https://js.volumepay.io');
    });
});
