import {afterEach, describe, expect, it, vi} from "vitest";
import {couponsEnabled, flag, flightsEnabled, hotelsEnabled, serviceStatusEnabled, walletEnabled} from "@/feature_flags.js";

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

// Value-added services are licensed per deployment and the API tells the app
// nothing about it; visibility is env only, one flag per product (SD-1036).
// Off unless the deployment says so: a flag that is on without the licence
// shows entry points that lead to 404s.
describe('value-added service flags', () => {
    afterEach(() => vi.unstubAllEnvs());

    it.each([
        ['VITE_HOTELS_ENABLED', hotelsEnabled],
        ['VITE_FLIGHTS_ENABLED', flightsEnabled],
        ['VITE_COUPONS_ENABLED', couponsEnabled],
        ['VITE_SERVICE_STATUS_ENABLED', serviceStatusEnabled],
    ])('%s is off unless set, and reads every spelling', (name, read) => {
        vi.stubEnv(name, '');
        expect(read()).toBe(false);
        for (const raw of ['0', 'no', 'off', 'false']) {
            vi.stubEnv(name, raw);
            expect(read()).toBe(false);
        }
        for (const raw of ['1', 'yes', 'on', 'true']) {
            vi.stubEnv(name, raw);
            expect(read()).toBe(true);
        }
    });

    // The wallet has the documented probe as its runtime guard; the flag is
    // the hard off-switch in front of it, so it stays on by default.
    it('the wallet switch is on unless turned off', () => {
        vi.stubEnv('VITE_WALLET_ENABLED', '');
        expect(walletEnabled()).toBe(true);
        vi.stubEnv('VITE_WALLET_ENABLED', 'false');
        expect(walletEnabled()).toBe(false);
    });

    it('the old single travel flag is gone', async () => {
        const flags = await import('@/feature_flags.js');
        expect(flags.travelEnabled).toBeUndefined();
    });
});
