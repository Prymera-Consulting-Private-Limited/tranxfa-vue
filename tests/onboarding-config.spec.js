import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createActor} from "xstate";
import {createPinia, setActivePinia} from "pinia";
import {useCustomerStore} from "@/stores/customer.js";
import Customer from "@/models/customer.js";
import Account from "@/models/account.js";
import {addressCollection, addressIsSkippable, collectsAddress, verifiesMobileNumber} from "@/onboarding_config.js";
import {fixture} from "./fixtures.js";

const pinia = createPinia();
setActivePinia(pinia);
const {onboardingNavigationMachine} = await import("@/machines/onboarding_navigation_machine.js");
const {mobileAuthOnboardingMachine} = await import("@/machines/mobile_number_onboarding_navigation_machine.js");

/**
 * The machines read the flags through the config module on every guard call,
 * so stubbing the env between tests is enough - no re-import needed.
 */
function setEnv(values) {
    for (const [key, value] of Object.entries(values)) {
        vi.stubEnv(key, value);
    }
}

function customerAt(fixtureName, mutate = () => {}) {
    const store = useCustomerStore(pinia);
    store.isLoaded = true;
    const customer = Customer.getInstance(fixture(fixtureName));
    mutate(customer);
    store.customer.data = customer;

    return customer;
}

const stepFrom = (machine) => {
    const actor = createActor(machine).start();
    actor.send({type: 'PROCEED'});

    return actor.getSnapshot().value;
};

describe('onboarding_config', () => {
    afterEach(() => vi.unstubAllEnvs());

    // Vite hands every env var over as a string, so "false" is truthy without
    // deliberate parsing - the single most likely way to misconfigure a brand.
    it.each([
        ['false', false], ['FALSE', false], ['0', false], ['no', false], ['off', false], [' false ', false],
        ['true', true], ['TRUE', true], ['1', true], ['yes', true], ['on', true],
    ])('reads %j as %s', (raw, expected) => {
        setEnv({VITE_ONBOARDING_VERIFY_MOBILE_NUMBER: raw});
        expect(verifiesMobileNumber()).toBe(expected);
    });

    it('defaults preserve current behaviour when nothing is set', () => {
        setEnv({VITE_ONBOARDING_COLLECT_ADDRESS: '', VITE_ONBOARDING_VERIFY_MOBILE_NUMBER: ''});

        expect(collectsAddress()).toBe(true);          // brands collect one today
        expect(verifiesMobileNumber()).toBe(false);    // no brand asked for this
    });
});

describe('address collection is optional', () => {
    beforeEach(() => {
        const store = useCustomerStore(pinia);
        store.isLoaded = false;
        store.customer.data = null;
    });
    afterEach(() => vi.unstubAllEnvs());

    it('email-first asks for the address when the flag is on', () => {
        setEnv({VITE_ONBOARDING_COLLECT_ADDRESS: 'true'});
        customerAt('profile-03-identity-done');

        expect(stepFrom(onboardingNavigationMachine)).toBe('addressInformation');
    });

    // The step is skipped, not merely hidden: everything after it chains through
    // addressInformationCompleted(), so a naive flag would strand the customer.
    it('email-first skips straight past it when the flag is off', () => {
        setEnv({VITE_ONBOARDING_COLLECT_ADDRESS: 'false'});
        customerAt('profile-03-identity-done');

        expect(stepFrom(onboardingNavigationMachine)).toBe('mobileNumberInput');
    });

    it('mobile-first asks for the address when the flag is on', () => {
        setEnv({VITE_ONBOARDING_COLLECT_ADDRESS: 'true'});
        customerAt('profile-05-onboarded', (c) => {
            c.identityInformationRequired = () => false;
            c.employmentInformationRequired = () => false;
            c.addressInformationRequired = () => true;
        });

        expect(stepFrom(mobileAuthOnboardingMachine)).toBe('addressInformation');
    });

    it('mobile-first reaches the email steps with the flag off', () => {
        setEnv({VITE_ONBOARDING_COLLECT_ADDRESS: 'false'});
        customerAt('profile-05-onboarded', (c) => {
            c.identityInformationRequired = () => false;
            c.employmentInformationRequired = () => false;
            c.addressInformationRequired = () => true;   // still outstanding
            c.account.isEmailVerified = false;
        });

        expect(stepFrom(mobileAuthOnboardingMachine)).toBe('emailVerification');
    });

    it('an outstanding address never blocks completion when not collected', () => {
        setEnv({VITE_ONBOARDING_COLLECT_ADDRESS: 'false', VITE_ONBOARDING_VERIFY_MOBILE_NUMBER: 'false'});
        customerAt('profile-05-onboarded', (c) => {
            c.addressInformationRequired = () => true;
        });

        expect(stepFrom(onboardingNavigationMachine)).toBe('onboardingComplete');
    });
});

// SD-1150. Three deployments wanted three answers and a boolean holds two, so
// quiqsend stopped using the flag and rewrote both machines on its branch -
// down to a "Skip for now" button and its own copy. `optional` is that
// behaviour, moved here, so the fork can go away and a merge from main stops
// threatening to revert it.
describe('address collection has three modes', () => {
    beforeEach(() => {
        const store = useCustomerStore(pinia);
        store.isLoaded = false;
        store.customer.data = null;
    });
    afterEach(() => vi.unstubAllEnvs());

    it.each([
        ['required', 'addressInformation'],
        ['optional', 'addressInformation'],   // shown, and skippable once there
        ['omitted', 'mobileNumberInput'],
    ])('%s routes a customer who owes an address to %s', (mode, expected) => {
        setEnv({VITE_ONBOARDING_ADDRESS: mode});
        customerAt('profile-03-identity-done');

        expect(stepFrom(onboardingNavigationMachine)).toBe(expected);
    });

    // The difference between required and optional, and the reason the mode
    // exists: with an address still outstanding, one lets the customer on and
    // the other does not.
    it('optional lets a customer past an address they have not given', () => {
        setEnv({VITE_ONBOARDING_ADDRESS: 'optional', VITE_ONBOARDING_VERIFY_MOBILE_NUMBER: 'false'});
        customerAt('profile-05-onboarded', (c) => {
            c.addressInformationRequired = () => true;
        });

        expect(stepFrom(onboardingNavigationMachine)).toBe('onboardingComplete');
    });

    it('required holds them there until it is given', () => {
        setEnv({VITE_ONBOARDING_ADDRESS: 'required'});
        customerAt('profile-05-onboarded', (c) => {
            c.addressInformationRequired = () => true;
        });

        expect(stepFrom(onboardingNavigationMachine)).toBe('addressInformation');
    });

    it('applies to the mobile-first flow too', () => {
        setEnv({VITE_ONBOARDING_ADDRESS: 'optional'});
        customerAt('profile-05-onboarded', (c) => {
            c.identityInformationRequired = () => false;
            c.employmentInformationRequired = () => false;
            c.addressInformationRequired = () => true;
        });

        expect(stepFrom(mobileAuthOnboardingMachine)).toBe('addressInformation');
    });

    it('defaults to required when nothing is set', () => {
        setEnv({VITE_ONBOARDING_ADDRESS: '', VITE_ONBOARDING_COLLECT_ADDRESS: ''});

        expect(addressCollection()).toBe('required');
        expect(collectsAddress()).toBe(true);
        expect(addressIsSkippable()).toBe(false);
    });

    it('ignores a mode it does not recognise rather than inventing one', () => {
        setEnv({VITE_ONBOARDING_ADDRESS: 'sometimes', VITE_ONBOARDING_COLLECT_ADDRESS: ''});

        expect(addressCollection()).toBe('required');
    });

    // payvel's Amplify environment sets the old boolean today, and payvel has
    // no AddressInformation component - ignoring it here would point that
    // deployment at a screen that does not exist.
    it.each([
        ['false', 'omitted'], ['0', 'omitted'], ['no', 'omitted'],
        ['true', 'required'], ['1', 'required'],
    ])('still honours the old boolean %j as %s', (raw, expected) => {
        setEnv({VITE_ONBOARDING_ADDRESS: '', VITE_ONBOARDING_COLLECT_ADDRESS: raw});

        expect(addressCollection()).toBe(expected);
    });

    it('lets the new variable win over the old one', () => {
        setEnv({VITE_ONBOARDING_ADDRESS: 'optional', VITE_ONBOARDING_COLLECT_ADDRESS: 'false'});

        expect(addressCollection()).toBe('optional');
    });

    it('offers Skip only where the address is optional', () => {
        setEnv({VITE_ONBOARDING_ADDRESS: 'optional'});
        expect(addressIsSkippable()).toBe(true);

        setEnv({VITE_ONBOARDING_ADDRESS: 'required'});
        expect(addressIsSkippable()).toBe(false);

        setEnv({VITE_ONBOARDING_ADDRESS: 'omitted'});
        expect(addressIsSkippable()).toBe(false);
    });
});

describe('mobile number verification is optional', () => {
    beforeEach(() => {
        const store = useCustomerStore(pinia);
        store.isLoaded = false;
        store.customer.data = null;
    });
    afterEach(() => vi.unstubAllEnvs());

    const onboardedWithNumber = (verified) => customerAt('profile-05-onboarded', (c) => {
        c.account.mobileNumber = '412345678';
        c.account.isMobileNumberVerified = verified;
    });

    it('finishes on an unverified number when the flag is off', () => {
        setEnv({VITE_ONBOARDING_VERIFY_MOBILE_NUMBER: 'false'});
        onboardedWithNumber(false);

        expect(stepFrom(onboardingNavigationMachine)).toBe('onboardingComplete');
    });

    it('asks for the code when the flag is on and the number is unverified', () => {
        setEnv({VITE_ONBOARDING_VERIFY_MOBILE_NUMBER: 'true'});
        onboardedWithNumber(false);

        expect(stepFrom(onboardingNavigationMachine)).toBe('mobileNumberVerification');
    });

    it('finishes once the number is verified', () => {
        setEnv({VITE_ONBOARDING_VERIFY_MOBILE_NUMBER: 'true'});
        onboardedWithNumber(true);

        expect(stepFrom(onboardingNavigationMachine)).toBe('onboardingComplete');
    });

    it('does not ask before a number has been given', () => {
        setEnv({VITE_ONBOARDING_VERIFY_MOBILE_NUMBER: 'true'});
        customerAt('profile-04-address-done', (c) => {
            c.account.mobileNumber = null;
        });

        expect(stepFrom(onboardingNavigationMachine)).toBe('mobileNumberInput');
    });

    it('lets the customer go back and correct the number', () => {
        setEnv({VITE_ONBOARDING_VERIFY_MOBILE_NUMBER: 'true'});
        onboardedWithNumber(false);

        const actor = createActor(onboardingNavigationMachine).start();
        actor.send({type: 'PROCEED'});
        expect(actor.getSnapshot().value).toBe('mobileNumberVerification');

        actor.send({type: 'EDIT_MOBILE_NUMBER'});
        expect(actor.getSnapshot().value).toBe('mobileNumberInput');
    });

    // Mobile-first proves the number with the signup OTP, so the step is
    // email-first only. Adding it there too would ask twice.
    it('is not part of the mobile-first flow', () => {
        expect(Object.keys(mobileAuthOnboardingMachine.config.states))
            .not.toContain('mobileNumberVerification');
    });
});

describe('Account maps the verification flag the API already sends', () => {
    it('reads mobile_number_verified from the captured profile', () => {
        const raw = fixture('profile-05-onboarded');
        expect(raw.account).toHaveProperty('mobile_number_verified');

        expect(Account.getInstance(raw.account).isMobileNumberVerified)
            .toBe(raw.account.mobile_number_verified);
    });
});
