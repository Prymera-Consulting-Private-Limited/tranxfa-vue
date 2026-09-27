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
import {flag} from '@/feature_flags.js';

/**
 * How onboarding treats the customer's residential address.
 *
 * Three deployments already wanted three different answers, and a boolean can
 * only hold two - which is why one of them stopped using the flag and edited
 * the state machine on a branch instead:
 *
 *   required   ask for it, and do not let the customer past until it is given.
 *              tranxfa's behaviour, and the default.
 *   optional   ask for it, and offer "Skip for now". quiqsend built exactly
 *              this by hand on its branch, down to the button and the copy.
 *   omitted    never ask. payvel, which has no AddressInformation component at
 *              all - targeting the step there would render nothing.
 *
 * None of these mean the address is never collected. The transfer wizard still
 * asks when the backend answers 412 `incomplete_customer_address` on confirm.
 * This only decides what onboarding does up front.
 *
 * @returns {'required'|'optional'|'omitted'}
 */
export function addressCollection() {
    const mode = import.meta.env.VITE_ONBOARDING_ADDRESS;

    if (['required', 'optional', 'omitted'].includes(mode)) {
        return mode;
    }

    // The boolean this replaces. payvel's Amplify environment sets it to false
    // today, and payvel cannot render an address step, so ignoring it here
    // would point that deployment at a screen that does not exist. It keeps
    // working until every environment has moved to VITE_ONBOARDING_ADDRESS.
    const legacy = import.meta.env.VITE_ONBOARDING_COLLECT_ADDRESS;

    if (legacy !== undefined && legacy !== '') {
        return flag(legacy, true) ? 'required' : 'omitted';
    }

    return 'required';
}

/**
 * Whether the address step can appear at all. False only for `omitted`.
 *
 * @returns {boolean}
 */
export function collectsAddress() {
    return addressCollection() !== 'omitted';
}

/**
 * Whether the customer may leave the address step without completing it.
 *
 * @returns {boolean}
 */
export function addressIsSkippable() {
    return addressCollection() === 'optional';
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
