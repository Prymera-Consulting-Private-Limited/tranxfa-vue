import {describe, expect, it} from "vitest";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// A build from `npm ci --omit=dev` used to fail on the first import in
// main.js, and every production request carried a header meant for ngrok.
describe('packaging', () => {
    const pkg = JSON.parse(read('package.json'));

    it('ships what main.js imports at runtime as dependencies', () => {
        for (const name of ['laravel-echo', 'pusher-js', 'axios', 'vue', 'vue-router', 'pinia']) {
            expect(pkg.dependencies, name).toHaveProperty(name);
            expect(pkg.devDependencies ?? {}, name).not.toHaveProperty(name);
        }
    });

    it('has every Volume surface fetch the sdk itself now index.html does not', () => {
        for (const f of ['src/components/Payment/Volume.vue', 'src/views/Travel/Bookings/Partials/VolumePayment.vue']) {
            expect(read(f), f).toContain('await loadVolumeSdk()');
        }
    });

    it('sends the ngrok header only to a local API', () => {
        expect(read('src/main.js')).toMatch(/if \(import\.meta\.env\.VITE_APP_ENV === 'local'\) \{\n\s*config\.headers\['ngrok-skip-browser-warning'\]/);
    });

    it('runs CI on the stacked feature PRs as well as main', () => {
        expect(read('.github/workflows/ci.yml')).toMatch(/pull_request:[\s\S]*branches: \[main, 'feature\/\*\*'\]/);
    });
});

describe('.env.example', () => {
    const example = read('.env.example');

    it('documents every VITE_ variable the source reads', () => {
        const used = new Set();
        const walk = (dir) => {
            for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
                const p = path.join(dir, entry.name);
                if (entry.isDirectory()) walk(p);
                else if (/\.(vue|js)$/.test(entry.name)) {
                    for (const m of fs.readFileSync(p, 'utf8').matchAll(/import\.meta\.env\??\.(VITE_[A-Z0-9_]+)/g)) used.add(m[1]);
                }
            }
        };
        walk(path.join(ROOT, 'src'));

        const missing = [...used].filter((name) => !new RegExp(`^#? ?${name}=`, 'm').test(example));
        expect(missing, 'VITE_ variables read by src/ but absent from .env.example').toEqual([]);
    });

    it('carries no credentials', () => {
        expect(example).not.toMatch(/VITE_APP_USERNAME|VITE_APP_PASSWORD/);
    });
});
