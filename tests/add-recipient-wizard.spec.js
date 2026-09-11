import {beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import axios from "axios";
import AddRecipientWizard from "@/components/Recipient/AddRecipientWizard.vue";
import TransactionQuote from "@/models/transaction_quote.js";
import {fixture, fixtureResponse} from "./fixtures.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));

// The wizard's job is to ask as little as possible: any step with exactly one
// answer is resolved and skipped rather than shown. These tests are about which
// step it lands on, so the step components are stubbed to bare markers.
const stubs = {
    TargetSelection: {name: 'TargetSelection', props: ['targets'], template: '<div data-step="target" />'},
    PayoutMethodSelection: {name: 'PayoutMethodSelection', props: ['payoutMethods'], template: '<div data-step="method" />'},
    RecipientTypeSelection: {name: 'RecipientTypeSelection', props: ['payoutChannel'], template: '<div data-step="type" />'},
    AttributeCollection: {name: 'AttributeCollection', props: ['payoutChannel', 'relationships', 'isSubmitted', 'quote'], template: '<div data-step="form" />'},
    Spinner: true,
};

const step = (wrapper) => wrapper.find('[data-step]').attributes('data-step') ?? null;

const target = (id) => ({country: {id: `c-${id}`, iso2_alpha: 'NG'}, currency: {id: `u-${id}`, iso_alpha: 'NGN'}});
const method = (id) => ({id: `pm-${id}`, code: 'BANK-TRANSFER', title: 'Bank transfer'});

const channelPayload = (recipientType = null) => ({
    ...fixture('payout-channel'),
    configuration: {
        ...fixture('payout-channel').configuration,
        recipient_type: recipientType,
    },
});

/**
 * Route the three GETs the wizard makes while walking its steps.
 */
function routeApi({targets = [], methods = [], recipientType = null} = {}) {
    axios.get.mockImplementation((url) => {
        if (url.includes('/payout/targets')) {
            return Promise.resolve({status: 200, data: {data: targets}});
        }
        if (url.includes('/payout/methods')) {
            return Promise.resolve({status: 200, data: {data: methods}});
        }
        if (url.includes('/payout/channel')) {
            return Promise.resolve({status: 200, data: channelPayload(recipientType)});
        }
        if (url.includes('/resources/relationships')) {
            return Promise.resolve(fixtureResponse('resources-relationships'));
        }

        return Promise.reject(new Error(`unrouted: ${url}`));
    });
}

async function mountWizard(props = {}) {
    const wrapper = mount(AddRecipientWizard, {props, global: {stubs}});
    await flushPromises();

    return wrapper;
}

describe('AddRecipientWizard', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('starting without a quote', () => {
        it('asks for the country when there is more than one corridor', async () => {
            routeApi({targets: [target(1), target(2)]});

            expect(step(await mountWizard())).toBe('target');
        });

        // The skips chain: one corridor resolves the target, which resolves the
        // method, which resolves the recipient type - so a single-corridor brand
        // opens straight on the form.
        it('skips a step that has exactly one answer', async () => {
            routeApi({targets: [target(1)], methods: [method(1), method(2)]});

            expect(step(await mountWizard())).toBe('method');
        });

        it('skips every step when each has exactly one answer', async () => {
            routeApi({
                targets: [target(1)],
                methods: [method(1)],
                recipientType: 'individual',
            });

            expect(step(await mountWizard())).toBe('form');
        });

        it('still asks for the recipient type when the channel does not fix one', async () => {
            routeApi({targets: [target(1)], methods: [method(1)], recipientType: null});

            expect(step(await mountWizard())).toBe('type');
        });

        it('loads the relationships the form needs before showing it', async () => {
            routeApi({targets: [target(1)], methods: [method(1)], recipientType: 'individual'});
            const wrapper = await mountWizard();

            expect(axios.get).toHaveBeenCalledWith('/client/v1/resources/relationships', expect.objectContaining({params: expect.any(Object)}));
            expect(wrapper.getComponent({name: 'AttributeCollection'}).props('relationships').length)
                .toBeGreaterThan(0);
        });
    });

    describe('starting from a quote', () => {
        const quote = () => TransactionQuote.getInstance(fixture('transaction-quote-with-recipient'));

        // Inside the transfer wizard the corridor is already decided, so the
        // country and method steps must never be shown again.
        it('takes the corridor from the quote and never asks for it', async () => {
            routeApi({recipientType: 'individual'});

            const wrapper = await mountWizard({quote: quote()});

            expect(step(wrapper)).toBe('form');
            expect(axios.get).not.toHaveBeenCalledWith(
                expect.stringContaining('/payout/targets'), expect.anything(),
            );
        });

        it('resolves the channel for the quote corridor', async () => {
            routeApi({recipientType: 'individual'});
            const q = quote();

            await mountWizard({quote: q});

            expect(axios.get).toHaveBeenCalledWith('/client/v1/payout/channel', {
                params: {
                    country_id: q.payoutCountry.id,
                    currency_id: q.payoutCurrency.id,
                    payout_method_id: q.payoutMethod.id,
                },
            });
        });

        it('hands the quote down so the form saves against it', async () => {
            routeApi({recipientType: 'individual'});
            const q = quote();

            const wrapper = await mountWizard({quote: q});

            // Reactivity proxies the object, so identity does not survive the
            // prop hop - the id is what decides which quote the recipient is
            // attached to.
            expect(wrapper.getComponent({name: 'AttributeCollection'}).props('quote').id).toBe(q.id);
        });

        it('passes the parent save trigger through to the form', async () => {
            routeApi({recipientType: 'individual'});
            const wrapper = await mountWizard({quote: quote(), externalSaveTrigger: false});

            await wrapper.setProps({externalSaveTrigger: true});

            expect(wrapper.getComponent({name: 'AttributeCollection'}).props('isSubmitted')).toBe(true);
        });
    });

    describe('reporting to the parent', () => {
        it('re-emits a saved recipient', async () => {
            routeApi({targets: [target(1)], methods: [method(1)], recipientType: 'individual'});
            const wrapper = await mountWizard();
            const recipient = {id: 'r-1'};

            await wrapper.getComponent({name: 'AttributeCollection'}).vm.$emit('recipient:added', recipient);

            expect(wrapper.emitted('recipient:added')[0]).toEqual([recipient]);
        });

        it('re-emits a failed save', async () => {
            routeApi({targets: [target(1)], methods: [method(1)], recipientType: 'individual'});
            const wrapper = await mountWizard();

            await wrapper.getComponent({name: 'AttributeCollection'}).vm.$emit('recipient:add:failed');

            expect(wrapper.emitted('recipient:add:failed')).toHaveLength(1);
        });

        // The transfer wizard disables Continue while this is busy, so the
        // signal has to cover the wizard's own loading and the form's.
        it('reports busy while resolving steps, then settles', async () => {
            routeApi({targets: [target(1)], methods: [method(1)], recipientType: 'individual'});
            const wrapper = await mountWizard();

            const states = wrapper.emitted('recipient:add:loadingStateUpdated').flat();
            expect(states).toContain(true);
            expect(states.at(-1)).toBe(false);
        });

        it('reports busy again when the form says it is saving', async () => {
            routeApi({targets: [target(1)], methods: [method(1)], recipientType: 'individual'});
            const wrapper = await mountWizard();

            await wrapper.getComponent({name: 'AttributeCollection'})
                .vm.$emit('recipient:add:loadingStateUpdated', true);

            expect(wrapper.emitted('recipient:add:loadingStateUpdated').flat().at(-1)).toBe(true);
        });
    });
});
