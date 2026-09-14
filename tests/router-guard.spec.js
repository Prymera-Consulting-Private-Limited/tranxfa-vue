import {beforeEach, describe, expect, it, vi} from "vitest";
import {createPinia, setActivePinia} from "pinia";
import axios from "axios";
import {createAuthGuard, PUBLIC_ROUTES, redirectQueryFor, safeRedirect} from "@/router/guards.js";
import {fixture} from "./fixtures.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));

const signedIn = ({mfaCompleted = true, emailVerified = true} = {}) => ({
    isLoaded: true,
    customer: {data: {account: {isEmailVerified: emailVerified}, session: {mfaMethod: 'EMAIL-OTP', isMfaCompleted: mfaCompleted}}},
});

const to = (name, fullPath = `/${name}`, query = {}) => ({name, fullPath, query});

// There was no guard at all: a signed-out deep link rendered the whole
// authenticated shell and waited for the API to say 401, and pages with no
// fetch of their own never redirected. session.isMfaCompleted was parsed and
// never read.
describe('the auth guard', () => {
    it('lets the public screens through without asking who is there', async () => {
        const refresh = vi.fn();
        const guard = createAuthGuard({store: {isLoaded: false, customer: {data: null}}, refresh});

        for (const name of PUBLIC_ROUTES) {
            expect(await guard(to(name))).toBe(true);
        }
        expect(refresh).not.toHaveBeenCalled();
    });

    it('loads the profile once for the first authenticated screen', async () => {
        const store = {isLoaded: false, customer: {data: null}};
        const refresh = vi.fn(async () => { store.isLoaded = true; store.customer.data = signedIn().customer.data; });
        const guard = createAuthGuard({store, refresh});

        expect(await guard(to('dashboard'))).toBe(true);
        expect(await guard(to('transactions'))).toBe(true);
        expect(refresh).toHaveBeenCalledTimes(1);
    });

    it('sends a signed-out customer to sign in, remembering where they were going', async () => {
        const guard = createAuthGuard({store: {isLoaded: false, customer: {data: null}}, refresh: vi.fn().mockRejectedValue(new Error('401'))});

        expect(await guard(to('viewTransaction', '/transaction/abc'))).toEqual({name: 'signIn', query: {redirect: '/transaction/abc'}});
    });

    it('holds a signed-in customer at the second factor until it is given', async () => {
        const guard = createAuthGuard({store: signedIn({mfaCompleted: false}), refresh: vi.fn()});

        expect(await guard(to('dashboard'))).toEqual({name: 'multiFactorAuth', query: {redirect: '/dashboard'}});
        expect(await guard(to('multiFactorAuth', '/mfa'))).toBe(true);
    });

    it('does not turn the onboarding hand-off into its own redirect', async () => {
        const guard = createAuthGuard({store: signedIn({mfaCompleted: false}), refresh: vi.fn()});

        expect(await guard(to('onboardingWorkflow', '/workflow/onboarding', {redirect: '/recipients'}))).toEqual({name: 'multiFactorAuth', query: {redirect: '/recipients'}});
    });

    // Seen in production on 9 Sep 2026: a customer signed up and the next
    // screen was the second-factor code, sent to an email they had not yet
    // verified. Onboarding verifies the email first; the gate waits for that.
    it('does not ask a new sign-up for a second factor before their email is verified', async () => {
        const guard = createAuthGuard({store: signedIn({mfaCompleted: false, emailVerified: false}), refresh: vi.fn()});

        expect(await guard(to('onboardingWorkflow'))).toBe(true);
        expect(await guard(to('dashboard'))).toBe(true);
    });

    it('asks for the second factor once the email is verified', async () => {
        const guard = createAuthGuard({store: signedIn({mfaCompleted: false, emailVerified: true}), refresh: vi.fn()});

        expect(await guard(to('onboardingWorkflow'))).toMatchObject({name: 'multiFactorAuth'});
    });

    it('lets an account without a second factor straight through', async () => {
        const store = {isLoaded: true, customer: {data: {session: {mfaMethod: null, isMfaCompleted: null}}}};
        expect(await createAuthGuard({store, refresh: vi.fn()})(to('dashboard'))).toBe(true);
    });
});

// A redirect that could leave the site is worse than none: it would carry a
// customer who has just typed their password wherever it pointed.
describe('safeRedirect', () => {
    it.each(['/dashboard', '/transaction/abc?x=1#top', '/recipients'])('keeps %s', (path) => {
        expect(safeRedirect(path)).toBe(path);
    });

    it.each(['https://evil.example/', '//evil.example', '/\\evil.example', 'dashboard', '', null, 42, '/x\nSet-Cookie: a'])('drops %j', (value) => {
        expect(safeRedirect(value)).toBeNull();
    });

    it('carries nothing for the sign-in page itself or the root', () => {
        expect(redirectQueryFor({fullPath: '/'})).toEqual({});
        expect(redirectQueryFor({fullPath: '/dashboard'})).toEqual({redirect: '/dashboard'});
    });
});

describe('wired into the router', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('bounces a signed-out deep link to sign-in with the destination', async () => {
        axios.get.mockRejectedValue(Object.assign(new Error('401'), {response: {status: 401}}));
        vi.resetModules();
        const {default: router} = await import('@/router/index.js');

        await router.push('/transactions');

        expect(router.currentRoute.value.name).toBe('signIn');
        expect(router.currentRoute.value.query.redirect).toBe('/transactions');
        expect(axios.get).toHaveBeenCalledWith('/client/v1/profile', {skipAuthRedirect: true});
    });

    it('lets a signed-in customer reach the page', async () => {
        axios.get.mockResolvedValue({data: fixture('profile-05-onboarded')});
        vi.resetModules();
        const {default: router} = await import('@/router/index.js');

        await router.push('/transactions');

        expect(router.currentRoute.value.name).toBe('transactions');
    });
});
