import {describe, expect, it} from "vitest";
import {createActor} from "xstate";
import {addRecipientNavigationMachine} from "@/machines/add_recipient_navigation_machine.js";

// This machine holds no store reference, so it needs no pinia. Its whole job is
// refusing to advance until the step's answer is in context - AddRecipientWizard
// relies on that to auto-skip any step with exactly one option without ever
// landing on it.

const start = () => createActor(addRecipientNavigationMachine).start();

describe('add recipient navigation machine', () => {
    it('opens on the target country', () => {
        expect(start().getSnapshot().value).toBe('targetSelection');
    });

    it.each([
        ['targetSelection',      'target',        'payoutMethodSelection'],
        ['payoutMethodSelection', 'payoutMethod',  'recipientTypeSelection'],
        ['recipientTypeSelection', 'recipientType', 'addRecipientForm'],
    ])('%s will not advance until %s is set', (_state, key, next) => {
        const actor = start();

        // Walk to the state under test by satisfying the earlier ones.
        const order = [
            ['target', {country: {id: 'c'}, currency: {id: 'u'}}],
            ['payoutMethod', {id: 'pm'}],
            ['recipientType', 'individual'],
        ];
        for (const [k, value] of order) {
            if (k === key) {
                break;
            }
            actor.send({type: 'SET_CONTEXT', [k]: value});
            actor.send({type: 'PROCEED'});
        }

        const before = actor.getSnapshot().value;
        actor.send({type: 'PROCEED'});
        expect(actor.getSnapshot().value, 'advanced without an answer').toBe(before);

        const value = order.find(([k]) => k === key)[1];
        actor.send({type: 'SET_CONTEXT', [key]: value});
        actor.send({type: 'PROCEED'});
        expect(actor.getSnapshot().value).toBe(next);
    });

    it('walks target -> method -> type -> form when each answer arrives', () => {
        const actor = start();
        const steps = [
            [{target: {country: {id: 'c'}, currency: {id: 'u'}}}, 'payoutMethodSelection'],
            [{payoutMethod: {id: 'pm'}}, 'recipientTypeSelection'],
            [{recipientType: 'individual'}, 'addRecipientForm'],
        ];

        for (const [context, expected] of steps) {
            actor.send({type: 'SET_CONTEXT', ...context});
            actor.send({type: 'PROCEED'});
            expect(actor.getSnapshot().value).toBe(expected);
        }
    });

    // SET_CONTEXT falls back to the existing value, so a later event that omits
    // a key must not wipe what an earlier one set.
    it('keeps earlier answers when a later SET_CONTEXT omits them', () => {
        const actor = start();
        actor.send({type: 'SET_CONTEXT', target: {country: {id: 'c'}}});
        actor.send({type: 'PROCEED'});
        actor.send({type: 'SET_CONTEXT', payoutMethod: {id: 'pm'}});

        expect(actor.getSnapshot().context.target).toEqual({country: {id: 'c'}});
        expect(actor.getSnapshot().context.payoutMethod).toEqual({id: 'pm'});
    });

    it('addRecipientForm is the last step and handles no further events', () => {
        const config = addRecipientNavigationMachine.config.states.addRecipientForm;

        expect(config.on ?? {}).toEqual({});
    });
});
