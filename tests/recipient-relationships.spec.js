import {beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {readFileSync} from "node:fs";
import axios from "axios";
import AddRecipientWizard from "@/components/Recipient/AddRecipientWizard.vue";
import en from "@/locales/en.json";
import {fixture, fixtureResponse} from "./fixtures.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));

// SD-1178. Two faults in the same wizard, both found on payvel production.
//
// The last step asks for a relationship, and the field is required. The list is
// fetched with `?country_id=<payout country>`; on every corridor of two live
// tenants that call answered 200 with an empty array, while the same endpoint
// without the filter answered with the tenant's ten relationships. Nothing in
// the wizard treated an empty list as a problem, so the customer reached step 4,
// opened a picker with nothing in it, and could never save. That is what a
// customer reports as "adding a recipient freezes".
//
// The first step had the opposite problem: it did notice its failure, but its
// "Try again" was `window.location.reload()` - which does not retry anything, it
// restarts the application at the splash screen and takes the wizard with it.

const stubs = {
    TargetSelection: {name: 'TargetSelection', props: ['targets'], template: '<div data-step="target" />'},
    PayoutMethodSelection: {name: 'PayoutMethodSelection', props: ['payoutMethods'], template: '<div data-step="method" />'},
    RecipientTypeSelection: {name: 'RecipientTypeSelection', props: ['payoutChannel'], template: '<div data-step="type" />'},
    AttributeCollection: {name: 'AttributeCollection', props: ['payoutChannel', 'relationships', 'isSubmitted', 'quote'], template: '<div data-step="form" />'},
    Spinner: true,
};

const step = (wrapper) => wrapper.find('[data-step]').attributes('data-step') ?? null;
const failure = (wrapper) => wrapper.findComponent({name: 'InlineFailure'});

const target = () => ({country: {id: 'c-1', iso2_alpha: 'NG'}, currency: {id: 'u-1', iso_alpha: 'NGN'}});
const method = () => ({id: 'pm-1', code: 'BANK-TRANSFER', title: 'Bank transfer'});

const channelPayload = () => ({
    ...fixture('payout-channel'),
    configuration: {...fixture('payout-channel').configuration, recipient_type: 'individual'},
});

/**
 * Walk the wizard to its last step, deciding for each of the two relationship
 * reads - the one filtered by country and the one without a filter - whether it
 * answers with the tenant's list or with nothing.
 *
 * @param {{scoped: boolean, unscoped: boolean, targets?: boolean}} answers
 */
function routeApi({scoped, unscoped, targets = true} = {}) {
    const relationships = (full) => (full
        ? fixtureResponse('resources-relationships')
        : {status: 200, data: {data: []}});

    axios.get.mockImplementation((url, config) => {
        if (url.includes('/payout/targets')) {
            return targets
                ? Promise.resolve({status: 200, data: {data: [target()]}})
                : Promise.reject(new Error('network down'));
        }
        if (url.includes('/payout/methods')) {
            return Promise.resolve({status: 200, data: {data: [method()]}});
        }
        if (url.includes('/payout/channel')) {
            return Promise.resolve({status: 200, data: channelPayload()});
        }
        if (url.includes('/resources/relationships')) {
            return Promise.resolve(relationships(config?.params?.country_id ? scoped : unscoped));
        }

        return Promise.reject(new Error(`unrouted: ${url}`));
    });
}

const mountWizard = async () => {
    const wrapper = mount(AddRecipientWizard, {global: {stubs}});
    await flushPromises();

    return wrapper;
};

const relationshipReads = () => axios.get.mock.calls
    .filter(([url]) => url.includes('/resources/relationships'))
    .map(([, config]) => config?.params?.country_id ?? null);

describe('the relationship list the last step needs', () => {
    beforeEach(() => vi.clearAllMocks());

    it('uses the corridor list when the back end has one', async () => {
        routeApi({scoped: true, unscoped: true});

        const wrapper = await mountWizard();

        expect(step(wrapper)).toBe('form');
        expect(relationshipReads()).toEqual(['c-1']);
        expect(wrapper.getComponent({name: 'AttributeCollection'}).props('relationships').length).toBeGreaterThan(0);
    });

    // The narrowing is the corridor's rule about which relationships it permits.
    // Narrowed to nothing there is no rule to honour - a required field with no
    // permitted value is not a restriction, it is a dead end - so the tenant's
    // full list stands in. As soon as the back end has per-country rows the
    // first read is non-empty and the fallback never runs.
    it('falls back to the unfiltered list when the corridor list is empty', async () => {
        routeApi({scoped: false, unscoped: true});

        const wrapper = await mountWizard();

        expect(relationshipReads()).toEqual(['c-1', null]);
        expect(step(wrapper)).toBe('form');
        expect(wrapper.getComponent({name: 'AttributeCollection'}).props('relationships').length).toBeGreaterThan(0);
    });

    it('says so rather than show an empty picker when there is no list at all', async () => {
        routeApi({scoped: false, unscoped: false});

        const wrapper = await mountWizard();

        expect(wrapper.find('[data-step]').exists(), 'the form must not open on a field that cannot be filled').toBe(false);
        expect(failure(wrapper).props('message')).toBe(en.recipient.weCouldntLoadThe4);
    });

    it('offers a retry that repeats the read', async () => {
        routeApi({scoped: false, unscoped: false});
        const wrapper = await mountWizard();

        routeApi({scoped: true, unscoped: true});
        await failure(wrapper).vm.$emit('retry');
        await flushPromises();

        expect(step(wrapper)).toBe('form');
    });
});

describe('retrying the first step', () => {
    beforeEach(() => vi.clearAllMocks());

    it('repeats the fetch instead of reloading the application', async () => {
        routeApi({scoped: true, unscoped: true, targets: false});
        const wrapper = await mountWizard();

        expect(failure(wrapper).props('message')).toBeTruthy();

        routeApi({scoped: true, unscoped: true, targets: true});
        await failure(wrapper).vm.$emit('retry');
        await flushPromises();

        expect(step(wrapper), 'retry must resume the wizard, not restart the app').toBe('form');
    });

    // The behavioural test above cannot see a reload: jsdom does not implement
    // navigation, so window.location.reload() is a silent no-op there and the
    // wizard would look like it recovered. This is the assertion that fails on
    // the old code.
    it('has no page reload left in the wizard', () => {
        const source = readFileSync('src/components/Recipient/AddRecipientWizard.vue', 'utf8');
        // The comment above the replacement names the call it replaced, so the
        // guard has to read code rather than prose.
        const code = source.split('\n').filter(line => ! line.trim().startsWith('//')).join('\n');

        expect(code).not.toMatch(/window\.location\.reload/);
    });
});
