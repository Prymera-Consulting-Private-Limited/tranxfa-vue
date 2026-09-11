import {afterEach, describe, expect, it, vi} from "vitest";
import {createPinia, setActivePinia} from "pinia";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));

// Several views reach a machine, which calls useCustomerStore() at module scope.
setActivePinia(createPinia());
const {default: router} = await import("@/router/index.js");

/**
 * Every path this app answers today, and the route name behind it.
 *
 * Brand branches merge main; a route that disappears from main disappears
 * from every brand on their next merge, and nothing else in the suite would
 * notice. Anything removed from this table has to be a decision.
 */
const ROUTES = {
    '/': 'signIn',
    '/mfa': 'multiFactorAuth',
    '/forgot-password': 'forgotPassword',
    '/reset-password/:token': 'resetPassword',
    '/secure-login': 'authByOtp',
    '/sign-up': 'signUp',
    '/workflow/onboarding': 'onboardingWorkflow',
    '/dashboard': 'dashboard',
    '/transfer/:quoteId': 'transferWizard',
    '/pay/:transactionId': 'makePayment',
    '/payment/cb/:transactionId': 'paymentCallback',
    '/transactions': 'transactions',
    '/transaction/:transactionId': 'viewTransaction',
    '/recipients': 'recipients',
    '/recipient/:id': 'viewRecipient',
    '/account-verification': 'accountVerification',
    '/account-verification/upload/:category': 'categoryView',
    '/settings': 'settings',
    // salvtech only: the brand's contact page (WhatsApp and email).
    '/contact': 'contact',
    '/devices': 'devices',
    '/:pathMatch(.*)*': 'notFound',
};

// Value-added services are env only (SD-1036): these routes exist only when
// the deployment turns them on, and the default is off.
const HOTEL_ROUTES = {
    '/travel/hotels': 'hotels',
    '/travel/hotel/:id/:slug': 'viewHotel',
    '/travel/quote/:id': 'travelQuote',
    '/travel/bookings': 'travelBookings',
    '/travel/booking/:id/payment': 'travelPaymentStatus',
    '/travel/booking/:id/pay': 'travelBookingPayment',
    '/travel/booking/:id': 'travelBooking',
};

const WALLET_ROUTES = {
    '/wallet': 'wallet',
    '/wallet/statement': 'walletStatement',
};

describe('router contract', () => {
    const routes = router.getRoutes();
    const byPath = new Map(routes.map(r => [r.path, r]));

    it.each(Object.entries(ROUTES))('serves %s as %s', (path, name) => {
        expect(byPath.get(path), `no route for ${path}`).toBeTruthy();
        expect(byPath.get(path).name).toBe(name);
    });

    it('registers no route this table does not know about', () => {
        const known = new Set([...Object.keys(ROUTES), ...Object.keys(WALLET_ROUTES)]);
        const surprises = routes.map(r => r.path).filter(p => !known.has(p));

        expect(surprises, 'add it to the table, deliberately').toEqual([]);
    });

    it('gives every named route a component', () => {
        for (const [path, name] of Object.entries(ROUTES)) {
            expect(byPath.get(path).components, `${name} has no component`).toBeTruthy();
        }
    });

    // A duplicate name silently shadows the earlier route, and the loser is
    // simply unreachable.
    it('has no duplicate route names', () => {
        const names = routes.map(r => r.name).filter(Boolean);
        expect(names.length).toBe(new Set(names).size);
    });
});

describe('value-added routes by env', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('does not register the hotel routes unless VITE_HOTELS_ENABLED is on', () => {
        const paths = new Set(router.getRoutes().map(r => r.path));
        for (const path of Object.keys(HOTEL_ROUTES)) {
            expect(paths.has(path), `${path} should not exist with hotels off`).toBe(false);
        }
    });

    it('registers every hotel route when VITE_HOTELS_ENABLED is on', async () => {
        vi.stubEnv('VITE_HOTELS_ENABLED', 'true');
        vi.resetModules();
        setActivePinia(createPinia());
        const {default: withHotels} = await import("@/router/index.js");
        const byPath = new Map(withHotels.getRoutes().map(r => [r.path, r]));
        for (const [path, name] of Object.entries(HOTEL_ROUTES)) {
            expect(byPath.get(path)?.name, path).toBe(name);
        }
    });

    it('drops the wallet routes when VITE_WALLET_ENABLED is off', async () => {
        vi.stubEnv('VITE_WALLET_ENABLED', 'false');
        vi.resetModules();
        setActivePinia(createPinia());
        const {default: withoutWallet} = await import("@/router/index.js");
        const paths = new Set(withoutWallet.getRoutes().map(r => r.path));
        for (const path of Object.keys(WALLET_ROUTES)) {
            expect(paths.has(path), path).toBe(false);
        }
    });
});
