import {beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {readFileSync} from "node:fs";
import axios from "axios";
import AddRecipientWizard from "@/components/Recipient/AddRecipientWizard.vue";
import en from "@/locales/en.json";
import {fixture, fixtureResponse} from "./fixtures.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));

// SD-1178, then SD-1182. Two faults in the same wizard, both found on payvel
// production.
//
// The last step asks for a relationship and the field is required. SD-1035 began
// narrowing that read by the recipient's country because the API reference
// documented the parameter; nobody checked there was data behind it. The back
// end joins a per-country mapping that is empty on every corridor of both live
// tenants, so the read came back empty, the customer reached step 4, opened a
// picker with nothing in it and could never save. That is what gets reported as
// "adding a recipient freezes". SD-1178 patched it by falling back to the
// unfiltered read; SD-1182 removed the parameter instead, so there is one read
// and the rule lives in the back end (SD-1181) rather than in every client.
//
// The first step had the opposite problem: it did notice its failure, but its
// "Try again" was window.location.reload(), which does not retry anything - it
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
 * Walk the wizard to its last step, deciding whether the relationships read and
 * the corridor read answer with something or with nothing.
 *
 * @param {{relationships?: boolean, targets?: boolean}} answers
 */
function routeApi({relationships = true, targets = true} = {}) {
    axios.get.mockImplementation((url) => {
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
            return Promise.resolve(relationships
                ? fixtureResponse('resources-relationships')
                : {status: 200, data: {data: []}});
        }

        return Promise.reject(new Error(`unrouted: ${url}`));
    });
}

const mountWizard = async () => {
    const wrapper = mount(AddRecipientWizard, {global: {stubs}});
    await flushPromises();

    return wrapper;
};

const relationshipReads = () => axios.get.mock.calls.filter(([url]) => url.includes('/resources/relationships'));

describe('the relationship list the last step needs', () => {
    beforeEach(() => vi.clearAllMocks());

    // The narrowing is off deliberately. It comes back when SD-1181 makes the
    // back end return the full list for a country with no mapping rows; until
    // then, sending the country empties a required field.
    it('is read once, with no country filter', async () => {
        routeApi();

        const wrapper = await mountWizard();

        expect(relationshipReads()).toHaveLength(1);
        const [url, config] = relationshipReads()[0];
        expect(url).toBe('/client/v1/resources/relationships');
        expect(config?.params?.country_id, 'a country with no mapping rows comes back empty').toBeUndefined();
        expect(step(wrapper)).toBe('form');
        expect(wrapper.getComponent({name: 'AttributeCollection'}).props('relationships').length).toBeGreaterThan(0);
    });

    it('says so rather than show an empty picker when the list is empty', async () => {
        routeApi({relationships: false});

        const wrapper = await mountWizard();

        expect(wrapper.find('[data-step]').exists(), 'the form must not open on a field that cannot be filled').toBe(false);
        expect(failure(wrapper).props('message')).toBe(en.recipient.weCouldntLoadThe4);
    });

    it('offers a retry that repeats the read', async () => {
        routeApi({relationships: false});
        const wrapper = await mountWizard();

        routeApi({relationships: true});
        await failure(wrapper).vm.$emit('retry');
        await flushPromises();

        expect(step(wrapper)).toBe('form');
    });
});

describe('retrying the first step', () => {
    beforeEach(() => vi.clearAllMocks());

    it('repeats the fetch instead of reloading the application', async () => {
        routeApi({targets: false});
        const wrapper = await mountWizard();

        expect(failure(wrapper).props('message')).toBeTruthy();

        routeApi({targets: true});
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
