/**
 * Which optional steps the onboarding flow includes, per deployment.
 *
 * Both onboarding machines and OnboardingWorkflowView read these, so a brand
 * changes an Amplify environment variable rather than a machine. Vite inlines
 * `import.meta.env` at build time, so a change needs a rebuild to take effect.
 *
 * Defaults preserve today's behaviour: address is collected, mobile number is
 * not verified. A brand opts in or out rather than inheriting a change.
 */

/**
 * Vite gives every env var as a string, so "false" is truthy without this.
 *
 * @param {*} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
function flag(value, fallback) {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

/**
 * Collect the customer's residential address during onboarding.
 *
 * Turning this off does not mean the address is never collected: the transfer
 * wizard still asks for it when the backend answers 412
 * incomplete_customer_address on confirm. It only decides whether onboarding
 * asks up front.
 *
 * @returns {boolean}
 */
export function collectsAddress() {
    return flag(import.meta.env.VITE_ONBOARDING_COLLECT_ADDRESS, true);
}

/**
 * Verify the customer's mobile number with a one-time code during onboarding.
 *
 * Off by default because no brand required it when the step was built. The API
 * has supported it all along - `verify-mobile-number`,
 * `resend-mobile-verification`, and `account.mobile_number_verified` on the
 * profile - so enabling it needs no backend work.
 *
 * Only meaningful on an email-first deployment. A mobile-first signup has
 * already proven the number by the time onboarding starts.
 *
 * @returns {boolean}
 */
export function verifiesMobileNumber() {
    return flag(import.meta.env.VITE_ONBOARDING_VERIFY_MOBILE_NUMBER, false);
}

/**
 * The deployment's sign-up channel, normalised.
 *
 * @returns {'EMAIL'|'MOBILE_NUMBER'|'BOTH'}
 */
export function authChannel() {
    const raw = String(import.meta.env.VITE_AUTH_CHANNEL ?? 'EMAIL').trim().toUpperCase();

    return ['EMAIL', 'MOBILE_NUMBER', 'BOTH'].includes(raw) ? raw : 'EMAIL';
}

/**
 * Which onboarding flow a given customer needs.
 *
 * EMAIL and MOBILE_NUMBER are fixed by the deployment. BOTH is not a third
 * flow: the brand lets people sign up either way, so the answer depends on the
 * customer in front of you, and the only reliable signal is what they already
 * have. A customer with no email address arrived by phone and still owes an
 * email; anyone else is on the email-first path.
 *
 * Getting this wrong is not cosmetic. The email-first machine opens on
 * emailVerification, whose guard reads account.isEmailVerified - so handing it
 * a mobile-only customer leaves every PROCEED target failing and strands them
 * on a screen asking them to verify an email they do not have.
 *
 * @param {Customer|null} customer
 * @returns {'EMAIL'|'MOBILE_NUMBER'}
 */
export function resolveOnboardingChannel(customer) {
    const channel = authChannel();

    if (channel !== 'BOTH') {
        return channel;
    }

    return customer?.account?.email ? 'EMAIL' : 'MOBILE_NUMBER';
}
