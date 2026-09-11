import {describe, expect, it, vi} from "vitest";
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
    '/travel/hotels': 'hotels',
    '/travel/hotel/:id/:slug': 'viewHotel',
    '/travel/hotel/quote/:id': 'hotelQuote',
    '/travel/hotel/book/:id': 'hotelBooking',
    '/travel/hotel/booking/:id': 'hotelBookingDetails',
    '/travel/quote/:id': 'travelQuote',
    '/travel/bookings': 'travelBookings',
    '/travel/booking/:id/payment': 'travelPaymentStatus',
    '/travel/booking/:id/pay': 'travelBookingPayment',
    '/travel/booking/:id': 'travelBooking',
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
    '/wallet': 'wallet',
    '/wallet/statement': 'walletStatement',
    '/:pathMatch(.*)*': 'notFound',
};

describe('router contract', () => {
    const routes = router.getRoutes();
    const byPath = new Map(routes.map(r => [r.path, r]));

    it.each(Object.entries(ROUTES))('serves %s as %s', (path, name) => {
        expect(byPath.get(path), `no route for ${path}`).toBeTruthy();
        expect(byPath.get(path).name).toBe(name);
    });

    it('registers no route this table does not know about', () => {
        const known = new Set(Object.keys(ROUTES));
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
