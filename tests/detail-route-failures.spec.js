import {describe, expect, it} from "vitest";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {getCustomerMessage} from "@/composables/api_utils.js";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

describe('messages an api failure is safe to show', () => {
    const message = text => getCustomerMessage({response: {data: {message: text}}});

    // Staging served exactly this to a customer looking at a booking that did not
    // exist. With debug off the framework omits the `exception` key, so the
    // key-based check alone let the raw message through.
    it.each([
        'No query results for model [App\\Models\\VasOrder] a0000000-0000-4000-8000-000000000000',
        'No query results for model [App\\Models\\Recipient] 1',
        'Target class [FooController] does not exist.',
        'Call to a member function id() on null',
        'Call to undefined method App\\Models\\Customer::foo()',
        'SQLSTATE[42S02]: Base table or view not found',
        'Undefined array key "quote"',
        'Route [login] not defined.',
    ])('refuses to show %s', text => {
        expect(message(text)).toBeNull();
    });

    // The endpoints write their own refusals, and those are far better words than
    // anything a client could invent. Square brackets alone must not disqualify a
    // message - only a namespaced class name inside them.
    it.each([
        'This price has expired. Please search again.',
        'Your card was declined by the issuer.',
        'The room [Deluxe King] is no longer available.',
        'Transfers to this country are not available on your account.',
    ])('keeps %s', text => {
        expect(message(text)).toBe(text);
    });

    it('still refuses a debug payload that names its exception', () => {
        expect(getCustomerMessage({response: {data: {message: 'Anything', exception: 'RuntimeException'}}})).toBeNull();
    });

    it('has nothing to say about a failure with no response', () => {
        expect(getCustomerMessage(new Error('Network Error'))).toBeNull();
        expect(getCustomerMessage(undefined)).toBeNull();
    });
});

describe('detail routes', () => {
    const router = fs.readFileSync(path.join(SRC, 'router', 'index.js'), 'utf8');

    // Every route whose path carries an id can be reached with one that does not
    // resolve: a stale bookmark, a completed step, a link shared out of another
    // account. Before this, the transaction view showed a shimmer forever, the
    // recipient view rendered nothing at all, and the transfer view said
    // "Loading..." with no way out.
    const parameterised = [...router.matchAll(/path: '([^']*:[^']*)',\s*\n\s*name: '([^']+)',[\s\S]{0,200}?component: \(\) => import\('@\/(views\/[^']+)'\)/g)]
        .map(m => ({path: m[1], name: m[2], file: m[3]}));

    it('finds the parameterised routes to check', () => {
        expect(parameterised.length).toBeGreaterThanOrEqual(10);
    });

    // A route whose param is a label rather than a record id fetches nothing, so
    // there is no failure for it to report. /coming-soon/:feature is one.
    const fetches = file => /Utils\.|axios|\bfetch\(/.test(fs.readFileSync(path.join(SRC, file.replace(/^views\//, 'views/')), 'utf8'));

    it.each(parameterised.map(r => [r.path, r.file]))('%s tells the customer when the id does not resolve', (_path, file) => {
        const src = fs.readFileSync(path.join(SRC, file), 'utf8');
        if (!fetches(file)) return;

        const handled = /LoadFailurePanel/.test(src)
            || /We couldn't load/.test(src)
            || /hasFailed|failureMessage|loadFailed/.test(src);

        expect(handled, `${file} has no branch for an id that does not resolve`).toBe(true);
    });
});
