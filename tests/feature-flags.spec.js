import {afterEach, describe, expect, it, vi} from "vitest";
import {flag, serviceStatusEnabled, verificationRequiredOnly} from "@/feature_flags.js";

describe('flag', () => {
    it.each([
        ['true', true], ['TRUE', true], ['1', true], ['yes', true], ['on', true], [' true ', true],
        ['false', false], ['FALSE', false], ['0', false], ['no', false], ['off', false], [' false ', false],
    ])('reads %j as %s', (raw, expected) => {
        expect(flag(raw, ! expected)).toBe(expected);
    });

    it.each([undefined, null, ''])('falls back when the variable is %j', (raw) => {
        expect(flag(raw, true)).toBe(true);
        expect(flag(raw, false)).toBe(false);
    });
});

// SD-1074: product visibility left this module. It was one hand-set flag per
// product per installation, and those drifted from the licence in both
// directions. The licence decides now, from value_added_services on
// service-status, so what is asserted here is that the flags are gone - not
// merely unused, gone - and that the one flag left means only what it says.
describe('the product flags are gone', () => {
    afterEach(() => vi.unstubAllEnvs());

    it.each(['hotelsEnabled', 'flightsEnabled', 'walletEnabled', 'couponsEnabled', 'travelEnabled'])(
        '%s is not exported any more', async (name) => {
            const flags = await import('@/feature_flags.js');

            expect(flags[name], `${name} still exists, so a deployment can still contradict the licence`)
                .toBeUndefined();
        });

    it('no source file reads a product flag from the environment', async () => {
        const {readdirSync, readFileSync} = await import('node:fs');
        const walk = (dir) => readdirSync(dir, {withFileTypes: true}).flatMap((e) => {
            const path = `${dir}/${e.name}`;
            return e.isDirectory() ? walk(path) : (/\.(?:js|vue)$/.test(e.name) ? [path] : []);
        });
        // A read, not a mention: this module names them on purpose, to say so.
        const gone = /import\.meta\.env\.VITE_(?:HOTELS|FLIGHTS|WALLET|COUPONS|TRAVEL)_ENABLED/;

        const offenders = walk('src').filter(f => gone.test(readFileSync(f, 'utf8')));

        expect(offenders, 'these still read a flag the licence replaced').toEqual([]);
    });
});

// The one flag left. It used to decide whether service-status was called at
// all; the same call carries the licence now, so it always runs and this
// decides only whether the maintenance banner renders.
describe('the maintenance banner flag', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('is off unless set, and reads every spelling', () => {
        vi.stubEnv('VITE_SERVICE_STATUS_ENABLED', '');
        expect(serviceStatusEnabled()).toBe(false);
        for (const raw of ['0', 'no', 'off', 'false']) {
            vi.stubEnv('VITE_SERVICE_STATUS_ENABLED', raw);
            expect(serviceStatusEnabled()).toBe(false);
        }
        for (const raw of ['1', 'yes', 'on', 'true']) {
            vi.stubEnv('VITE_SERVICE_STATUS_ENABLED', raw);
            expect(serviceStatusEnabled()).toBe(true);
        }
    });
});

// SD-1223. Off unless a brand asks, so every deployment keeps listing every
// category until it decides otherwise.
describe('the required-documents-only flag', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('is off unless set, and reads every spelling', () => {
        vi.stubEnv('VITE_VERIFICATION_REQUIRED_ONLY', '');
        expect(verificationRequiredOnly()).toBe(false);
        for (const raw of ['0', 'no', 'off', 'false']) {
            vi.stubEnv('VITE_VERIFICATION_REQUIRED_ONLY', raw);
            expect(verificationRequiredOnly()).toBe(false);
        }
        for (const raw of ['1', 'yes', 'on', 'true']) {
            vi.stubEnv('VITE_VERIFICATION_REQUIRED_ONLY', raw);
            expect(verificationRequiredOnly()).toBe(true);
        }
    });
});
