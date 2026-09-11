/**
 * Which screen clears a 412 the customer can act on.
 *
 * The back office audited the identity handout and listed sixteen `type`s the
 * confirm endpoint can answer with, plus two on the token endpoint. Several
 * describe something the customer has to *do* rather than read: verify a
 * mobile number, finish the identity form, add an address. A sentence for
 * those is a dead end, and the customer cannot tell it from a refusal.
 *
 * Anything not listed here still shows the API's message, as before.
 */

const ONBOARDING_TYPES = new Set([
    'unverified_customer_mobile_number',
    'incomplete_customer_identity',
]);

const ADDRESS_TYPES = new Set([
    'incomplete_customer_address',
]);

// Answered by the wallet's deposit instructions and declared loads until the
// identity document is approved; the fix is the verification page.
const IDENTITY_TYPES = new Set([
    'wallet_id_verification_required',
]);

/**
 * @param {string|null|undefined} type the 412 body's `type`
 * @param {string|null} returnTo where to come back to afterwards, a path on this site
 * @returns {{route: object, label: string}|null}
 */
export function fixFor(type, returnTo = null) {
    const query = returnTo ? {redirect: returnTo} : {};

    if (ONBOARDING_TYPES.has(type)) {
        return {route: {name: 'onboardingWorkflow', query}, label: 'Complete your details'};
    }

    if (ADDRESS_TYPES.has(type)) {
        return {route: {name: 'onboardingWorkflow', query}, label: 'Add your address'};
    }

    if (IDENTITY_TYPES.has(type)) {
        return {route: {name: 'accountVerification', query}, label: 'Verify your identity'};
    }

    return null;
}

/**
 * @param {*} error an axios error
 * @param {string|null} returnTo
 * @returns {{route: object, label: string}|null}
 */
export function fixForError(error, returnTo = null) {
    if (error?.response?.status !== 412) {
        return null;
    }

    return fixFor(error.response.data?.type, returnTo);
}
