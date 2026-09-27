import {beforeEach, describe, expect, it} from "vitest";
import {createActor} from "xstate";
import {createPinia, setActivePinia} from "pinia";
import {useCustomerStore} from "@/stores/customer.js";
import Customer from "@/models/customer.js";
import {fixture} from "./fixtures.js";

// The machine calls useCustomerStore() at module scope and closes over the
// result, so a pinia has to exist before it is imported. Everything else in
// this file depends on that ordering.
const pinia = createPinia();
setActivePinia(pinia);
const {onboardingNavigationMachine} = await import("@/machines/onboarding_navigation_machine.js");

/**
 * Point the store at a captured profile and run the machine from its initial
 * state. The guards read the store directly, so this is the whole setup.
 */
function proceedFrom(fixtureName, {events = ['PROCEED']} = {}) {
    const store = useCustomerStore(pinia);
    store.isLoaded = true;
    store.customer.data = Customer.getInstance(fixture(fixtureName));

    const actor = createActor(onboardingNavigationMachine).start();
    for (const type of events) {
        actor.send({type});
    }

    return actor.getSnapshot().value;
}

describe('onboarding navigation machine', () => {
    beforeEach(() => {
        const store = useCustomerStore(pinia);
        store.isLoaded = false;
        store.customer.data = null;
    });

    // The targets on each PROCEED are listed furthest-first, so one event lands
    // the customer at the furthest step they qualify for. That is what makes
    // the flow resumable: someone returning mid-onboarding skips straight to
    // their first incomplete step rather than walking the whole thing again.
    it.each([
        ['profile-01-fresh',          'emailVerification'],
        ['profile-02-email-verified', 'identityInformation'],
        ['profile-03-identity-done',  'addressInformation'],
        ['profile-04-address-done',   'mobileNumberInput'],
        ['profile-05-onboarded',      'onboardingComplete'],
    ])('%s resumes at %s from a single PROCEED', (name, expected) => {
        expect(proceedFrom(name)).toBe(expected);
    });

    it('stays put when nothing is loaded, rather than guessing a step', () => {
        const actor = createActor(onboardingNavigationMachine).start();
        actor.send({type: 'PROCEED'});

        // Every guard asserts isLoaded, so an unloaded store must not advance.
        expect(actor.getSnapshot().value).toBe('emailVerification');
    });

    it('an unverified email cannot leave the first step', () => {
        // profile-01 is signed up but not verified. No amount of PROCEED moves
        // it on, which is what stops a half-registered customer reaching the
        // dashboard.
        expect(proceedFrom('profile-01-fresh', {events: ['PROCEED', 'PROCEED', 'PROCEED']}))
            .toBe('emailVerification');
    });

    it('reaching onboardingComplete is final', () => {
        const store = useCustomerStore(pinia);
        store.isLoaded = true;
        store.customer.data = Customer.getInstance(fixture('profile-05-onboarded'));

        const actor = createActor(onboardingNavigationMachine).start();
        actor.send({type: 'PROCEED'});
        const snapshot = actor.getSnapshot();

        expect(snapshot.value).toBe('onboardingComplete');
        expect(snapshot.status).toBe('done');
    });

    describe('going back', () => {
        it('CHANGE_COUNTRY returns to the country step from identity', () => {
            const store = useCustomerStore(pinia);
            store.isLoaded = true;
            store.customer.data = Customer.getInstance(fixture('profile-02-email-verified'));

            const actor = createActor(onboardingNavigationMachine).start();
            actor.send({type: 'PROCEED'});
            expect(actor.getSnapshot().value).toBe('identityInformation');

            actor.send({type: 'CHANGE_COUNTRY'});
            expect(actor.getSnapshot().value).toBe('sourceCountrySelection');
        });

        it('EDIT_PERSONAL_INFORMATION returns to identity from a later step', () => {
            const store = useCustomerStore(pinia);
            store.isLoaded = true;
            store.customer.data = Customer.getInstance(fixture('profile-04-address-done'));

            const actor = createActor(onboardingNavigationMachine).start();
            actor.send({type: 'PROCEED'});
            expect(actor.getSnapshot().value).toBe('mobileNumberInput');

            actor.send({type: 'EDIT_PERSONAL_INFORMATION'});
            expect(actor.getSnapshot().value).toBe('identityInformation');
        });
    });

    // A step added without wiring it into every earlier state's PROCEED list is
    // silently unreachable from those states - the failure mode the
    // furthest-first ordering invites. This walks the machine definition rather
    // than a hand-written list, so a new state cannot slip past it.
    it('every non-final state is reachable from at least one PROCEED target', () => {
        const states = Object.keys(onboardingNavigationMachine.config.states);
        const targeted = new Set(['emailVerification']); // the initial state

        for (const state of Object.values(onboardingNavigationMachine.config.states)) {
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
});
