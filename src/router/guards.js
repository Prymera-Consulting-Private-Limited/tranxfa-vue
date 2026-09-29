/**
 * Route guards.
 *
 * Until this existed there was no authentication guard at all: every
 * authenticated route rendered its shell and waited for the API to answer 401,
 * and the session's MFA state was parsed and never read, so the MFA step was a
 * suggestion rather than a gate.
 */

/** Routes a signed-out customer may open. */
export const PUBLIC_ROUTES = new Set([
    'signIn',
    'signUp',
    'forgotPassword',
    'resetPassword',
    'authByOtp',
    'notFound',
]);

/**
 * A redirect target is only ever a path on this site. Anything with a scheme
 * or a protocol-relative prefix could send a customer who has just typed their
 * password somewhere else.
 *
 * @param {*} value
 * @returns {string|null}
 */
export function safeRedirect(value) {
    if (typeof value !== 'string' || value.length === 0 || value.length > 2048) {
        return null;
    }
    if (! value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\') || /[\r\n\t]/.test(value)) {
        return null;
    }

    return value;
}

/**
 * @param {object} to a route location
 * @returns {{redirect: string}|{}}
 */
export function redirectQueryFor(to) {
    const target = safeRedirect(to?.fullPath);

    return target && target !== '/' ? {redirect: target} : {};
}

/**
 * @param {{store: {isLoaded: boolean, customer: {data: object|null}}, refresh: Function}} deps
 * @returns {Function} a vue-router beforeEach guard
 */
export function createAuthGuard({store, refresh}) {
    return async (to) => {
        if (PUBLIC_ROUTES.has(to.name)) {
            return true;
        }

        if (! store.isLoaded) {
            try {
                await refresh();
            } catch (e) {
                return {name: 'signIn', query: redirectQueryFor(to)};
            }
        }

        const customer = store.customer.data;
        if (! customer) {
            return {name: 'signIn', query: redirectQueryFor(to)};
        }

        // Signed in, but the second factor the account asks for has not been
        // given yet. Only the MFA screen itself is allowed through.
        //
        // A brand-new sign-up has the account's MFA method set and the
        // session not yet completed, but the code would go to an email the
        // customer has not verified. The sign-in handler has always asked for
        // the second factor only once the email is verified; onboarding
        // verifies the email first. This gate follows the same rule.
        const session = customer.session;
        const emailVerified = customer.account?.isEmailVerified === true;
        if (emailVerified && session?.mfaMethod && session.isMfaCompleted === false && to.name !== 'multiFactorAuth') {
            return {name: 'multiFactorAuth', query: to.name === 'onboardingWorkflow' ? {...to.query} : {...to.query, ...redirectQueryFor(to)}};
        }

        return true;
    };
}
