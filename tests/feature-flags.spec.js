import {afterEach, describe, expect, it, vi} from "vitest";
import {flag, travelEnabled} from "@/feature_flags.js";

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

describe('travelEnabled', () => {
    afterEach(() => vi.unstubAllEnvs());

    // feature/travel_hotels read this inline as `VITE_TRAVEL_ENABLED !==
    // 'false'`, which only recognises the exact string "false". A deployment
    // without the travel licence that wrote 0, no or off got the Hotels and
    // Bookings tabs anyway, pointing at routes the backend answers 404 for.
    it.each(['0', 'no', 'off', 'false', 'FALSE'])('is off for %j', (raw) => {
        vi.stubEnv('VITE_TRAVEL_ENABLED', raw);
        expect(travelEnabled()).toBe(false);
    });

    it.each(['1', 'yes', 'on', 'true'])('is on for %j', (raw) => {
        vi.stubEnv('VITE_TRAVEL_ENABLED', raw);
        expect(travelEnabled()).toBe(true);
    });

    // Default-on is what the feature branch shipped. A deployment without the
    // licence has to say so explicitly.
    it('defaults to on when unset', () => {
        vi.stubEnv('VITE_TRAVEL_ENABLED', '');
        expect(travelEnabled()).toBe(true);
    });
});
