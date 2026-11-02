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
        // Hotel routes join the table: they used to be absent unless a flag
        // built them, and are now always registered and guarded by licence.
        const known = new Set([
            ...Object.keys(ROUTES),
            ...Object.keys(WALLET_ROUTES),
            ...Object.keys(HOTEL_ROUTES),
        ]);
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

    // SD-1074: these used to assert that a flag decided which routes were
    // built. The licence arrives from service-status after module load, so it
    // cannot; every product route is registered and the guard judges it. The
    // assertions move to the two things that now carry the rule.
    it('registers every hotel route, and marks each with the product it needs', () => {
        const byPath = new Map(router.getRoutes().map(r => [r.path, r]));

        for (const [path, name] of Object.entries(HOTEL_ROUTES)) {
            expect(byPath.get(path)?.name, path).toBe(name);
            expect(byPath.get(path)?.meta?.requiresProduct, `${path} must name its product`).toBe('HOTELS');
        }
    });

    it('registers every wallet route, and marks each with the product it needs', () => {
        const byPath = new Map(router.getRoutes().map(r => [r.path, r]));

        for (const [path, name] of Object.entries(WALLET_ROUTES)) {
            expect(byPath.get(path)?.name, path).toBe(name);
            expect(byPath.get(path)?.meta?.requiresProduct, `${path} must name its product`).toBe('WALLETS');
        }
    });

    it('leaves no product route unguarded', () => {
        const guarded = new Set([...Object.keys(HOTEL_ROUTES), ...Object.keys(WALLET_ROUTES)]);
        const missing = router.getRoutes()
            .filter(r => guarded.has(r.path) && ! r.meta?.requiresProduct)
            .map(r => r.path);

        expect(missing, 'a product route with no requiresProduct is a 404 waiting to happen').toEqual([]);
    });
});
