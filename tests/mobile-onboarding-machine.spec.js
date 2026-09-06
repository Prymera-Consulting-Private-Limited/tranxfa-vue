import {beforeEach, describe, expect, it} from "vitest";
import {createActor} from "xstate";
import {createPinia, setActivePinia} from "pinia";
import {useCustomerStore} from "@/stores/customer.js";
import Customer from "@/models/customer.js";
import {fixture} from "./fixtures.js";

// The variant selected by VITE_AUTH_CHANNEL=MOBILE_NUMBER: the customer signs
// up with a phone number, so email moves to the END of onboarding instead of
// gating it. Brands run one or the other, and only this machine's shape says
// which order applies.
const pinia = createPinia();
setActivePinia(pinia);
const {mobileAuthOnboardingMachine} = await import("@/machines/mobile_number_onboarding_navigation_machine.js");

function withCustomer(mutate = () => {}) {
    const store = useCustomerStore(pinia);
    store.isLoaded = true;
    const customer = Customer.getInstance(fixture('profile-05-onboarded'));
    mutate(customer);
    store.customer.data = customer;

    const actor = createActor(mobileAuthOnboardingMachine).start();
    actor.send({type: 'PROCEED'});

    return actor.getSnapshot().value;
}

describe('mobile-first onboarding machine', () => {
    beforeEach(() => {
        const store = useCustomerStore(pinia);
        store.isLoaded = false;
        store.customer.data = null;
    });

    it('opens on identity, not email - the phone number is already known', () => {
        expect(mobileAuthOnboardingMachine.config.initial).toBe('identityInformation');
    });

    it('completes when identity, address and a verified email are all present', () => {
        expect(withCustomer()).toBe('onboardingComplete');
    });

    // CHARACTERIZATION - this asserts a defect, not intended behaviour.
    //
    // Every other guard in this family is cumulative: it re-asserts the steps
    // before it. `emailVerified()` is not - it reads only
    // account.isEmailVerified. So a customer whose identity information is
    // still incomplete, but whose email is verified, falls past every earlier
    // target and lands on onboardingComplete, which routes to the dashboard.
    //
    // The email-first machine does not have this hole; its equivalent guards
    // chain the whole prefix. Fixing it means making emailVerified() (and
    // emailVerificationRequired(), which is built on it) assert
    // addressInformationCompleted() the way doesNotHaveEmail() already does.
    //
    // Left as-is deliberately: this machine gates KYC capture for any brand
    // running VITE_AUTH_CHANNEL=MOBILE_NUMBER, and changing it is a decision
    // rather than a tidy-up. The backend's 412 still blocks the transfer
    // itself, so this skips collection, not compliance.
    it('lets a verified email skip incomplete identity information (known defect)', () => {
        expect(withCustomer((c) => {
            c.identityInformationRequired = () => true;
        })).toBe('onboardingComplete');
    });

    it('collects employment when the profile requires it', () => {
        expect(withCustomer((c) => {
            c.identityInformationRequired = () => false;
            c.employmentInformationRequired = () => true;
        })).toBe('employmentInformation');
    });

    it('collects the address when it is outstanding', () => {
        expect(withCustomer((c) => {
            c.identityInformationRequired = () => false;
            c.employmentInformationRequired = () => false;
            c.addressInformationRequired = () => true;
        })).toBe('addressInformation');
    });

    // The step that does not exist in the email-first machine: a mobile signup
    // has no address on file, so the app has to ask for one.
    it('asks for an email address when the customer has none', () => {
        expect(withCustomer((c) => {
            c.identityInformationRequired = () => false;
            c.employmentInformationRequired = () => false;
            c.addressInformationRequired = () => false;
            c.account.email = null;
        })).toBe('emailInput');
    });

    it('verifies an email that is present but unverified', () => {
        expect(withCustomer((c) => {
            c.identityInformationRequired = () => false;
            c.employmentInformationRequired = () => false;
            c.addressInformationRequired = () => false;
            c.account.isEmailVerified = false;
        })).toBe('emailVerification');
    });

    it('holds still when nothing is loaded', () => {
        const actor = createActor(mobileAuthOnboardingMachine).start();
        actor.send({type: 'PROCEED'});

        expect(actor.getSnapshot().value).toBe('identityInformation');
    });

    it('every state is reachable from some transition', () => {
        const states = Object.keys(mobileAuthOnboardingMachine.config.states);
        const targeted = new Set([mobileAuthOnboardingMachine.config.initial]);

        for (const state of Object.values(mobileAuthOnboardingMachine.config.states)) {
            for (const transitions of Object.values(state.on ?? {})) {
                for (const t of [transitions].flat()) {
                    if (t.target) {
                        targeted.add(t.target);
                    }
                }
            }
        }

        expect([...states].sort()).toEqual([...targeted].sort());
    });

    // The two machines are alternatives for the same job, so a step added to
    // one and forgotten in the other is a real divergence between brands.
    it('covers the same ground as the email-first machine, minus the country step', async () => {
        const {onboardingNavigationMachine} = await import("@/machines/onboarding_navigation_machine.js");
        const emailFirst = new Set(Object.keys(onboardingNavigationMachine.config.states));
        const mobileFirst = new Set(Object.keys(mobileAuthOnboardingMachine.config.states));

        // Known, deliberate differences.
        emailFirst.delete('sourceCountrySelection'); // country comes from the phone's ISD
        emailFirst.delete('mobileNumberInput');      // already collected at signup
        mobileFirst.delete('emailInput');            // email is not collected at signup

        expect([...mobileFirst].sort()).toEqual([...emailFirst].sort());
    });
});
