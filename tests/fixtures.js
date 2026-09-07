import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {vi} from 'vitest';

const FIXTURE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'api');

/**
 * Load a captured API response by fixture name (no .json).
 *
 * Fixtures are real responses recorded from a seeded local console.remitso —
 * see tests/fixtures/README.md. Each call returns a fresh deep copy, so a test
 * that mutates the payload cannot leak into the next one.
 *
 * @param {string} name
 * @returns {object}
 */
export function fixture(name) {
    const file = path.join(FIXTURE_DIR, `${name}.json`);
    if (! fs.existsSync(file)) {
        throw new Error(`No API fixture "${name}". Available: ${fixtureNames().join(', ')}`);
    }

    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * @returns {string[]} every available fixture name
 */
export function fixtureNames() {
    return fs.readdirSync(FIXTURE_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace(/\.json$/, ''))
        .sort();
}

/**
 * An axios-style success envelope, as the composables see it.
 *
 * @param {string} name
 * @param {number} status
 */
export function fixtureResponse(name, status = 200) {
    return {status, data: fixture(name)};
}

/**
 * An axios-style rejection, as the composables' .catch() blocks see it.
 *
 * The SPA branches on `e.response.status` and `e.response.data.type`, and in a
 * few older places on `e.status` — both are set here so either style works.
 *
 * @param {string} name
 * @param {number} status
 */
export function fixtureError(name, status) {
    const response = {status, data: fixture(name)};

    return Object.assign(new Error(`Request failed with status code ${status}`), {
        status,
        response,
        isAxiosError: true,
    });
}

/**
 * Route axios.get/post by URL against a {pattern: fixtureName} map, so a test
 * can stand up several endpoints at once instead of chaining mockResolvedValue.
 *
 * Patterns are matched as substrings, longest first, so a specific path wins
 * over a prefix it shares with another.
 *
 * @param {object} axios - the mocked axios module
 * @param {Record<string, string|{name: string, status: number}>} routes
 */
export function mockApi(axios, routes) {
    const entries = Object.entries(routes).sort((a, b) => b[0].length - a[0].length);

    const handler = (url) => {
        const match = entries.find(([pattern]) => String(url).includes(pattern));
        if (! match) {
            return Promise.reject(new Error(`No fixture route for ${url}`));
        }
        const target = match[1];
        const {name, status} = typeof target === 'string'
            ? {name: target, status: 200}
            : target;

        return status >= 400
            ? Promise.reject(fixtureError(name, status))
            : Promise.resolve(fixtureResponse(name, status));
    };

    axios.get?.mockImplementation?.(handler);
    axios.post?.mockImplementation?.(handler);
    axios.delete?.mockImplementation?.(handler);

    return handler;
}

/**
 * Restore a clean slate between tests.
 */
export function resetApiMocks() {
    vi.clearAllMocks();
}
