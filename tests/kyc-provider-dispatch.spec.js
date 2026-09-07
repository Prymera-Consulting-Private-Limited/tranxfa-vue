import {beforeEach, describe, expect, it, vi} from "vitest";
import {mount} from "@vue/test-utils";
import {createPinia, setActivePinia} from "pinia";
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
import {modalStubs} from "./helpers.js";
import {fixture} from "./fixtures.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));

// The real provider components each boot a third-party SDK on mount. This spec
// is about which one the chain picks, so they are replaced by markers.
const marker = (name) => ({[`default`]: {
    name,
    emits: ['sdkInitialized', 'sdkError', 'sdkStepCompleted', 'sdkApplicantStatusChanged', 'sdkCancelled'],
    template: `<div />`,
}});
vi.mock('@/components/AccountVerification/Provider/Sumsub.vue', () => marker('Sumsub'));
vi.mock('@/components/AccountVerification/Provider/UpPass.vue', () => marker('UpPass'));
vi.mock('@/components/AccountVerification/Provider/Persona.vue', () => marker('Persona'));
vi.mock('@/components/AccountVerification/Provider/Shufti.vue', () => marker('Shufti'));
vi.mock('@/components/AccountVerification/Provider/Didit.vue', () => marker('Didit'));
vi.mock('@/components/AccountVerification/Provider/System.vue', () => marker('System'));

setActivePinia(createPinia());
const {default: DocumentTypeItem} = await import("@/components/AccountVerification/DocumentTypeItem.vue");

const PROVIDERS = ['Sumsub', 'UpPass', 'Persona', 'Shufti', 'Didit', 'System'];

/**
 * The POI passport type from the captured document-categories response, with
 * its `api` swapped for the code under test.
 */
function documentTypeWithApi(api) {
    const categories = fixture('document-categories');
    const poi = categories.find(c => c.code === 'POI');
    const type = DocumentType.getInstance(poi.document_types[0]);
    type.api = api;

    return {category: DocumentCategory.getInstance(poi), type};
}

/**
 * Mounts the tile and opens the modal, which is where the chain lives.
 */
async function openFor(api) {
    const {category, type} = documentTypeWithApi(api);
    const wrapper = mount(DocumentTypeItem, {
        props: {documentCategory: category, documentType: type},
        global: {stubs: modalStubs},
    });
    await wrapper.get('a').trigger('click');

    return wrapper;
}

/**
 * @returns {string[]} the provider components actually rendered
 */
const rendered = (wrapper) => PROVIDERS.filter(
    name => wrapper.findComponent({name}).exists(),
);

describe('DocumentTypeItem provider dispatch', () => {
    beforeEach(() => vi.clearAllMocks());

    it.each([
        ['SUMSUB', 'Sumsub'],
        ['SUMSUB-VIA-FINCODE', 'Sumsub'],
        ['UPPASS', 'UpPass'],
        ['CYBRID', 'Persona'],
        ['SHUFTI', 'Shufti'],
        ['DIDIT', 'Didit'],
        ['SYSTEM', 'System'],
    ])('renders %s through %s', async (api, component) => {
        expect(rendered(await openFor(api))).toEqual([component]);
    });

    // SUMSUB-VIA-FINCODE is Sumsub behind Fincode - the same web SDK and the
    // same /account-verification/token endpoint, so it must reach the same
    // component rather than needing one of its own.
    it('treats SUMSUB-VIA-FINCODE exactly like SUMSUB', async () => {
        const viaFincode = await openFor('SUMSUB-VIA-FINCODE');
        const direct = await openFor('SUMSUB');

        expect(rendered(viaFincode)).toEqual(rendered(direct));
        expect(viaFincode.findComponent({name: 'Sumsub'}).exists()).toBe(true);
    });

    // The chain has no fallback: a code the SPA does not know leaves the
    // customer on a spinner that never resolves. That is the cost of getting
    // the provider string wrong, so it is pinned here deliberately.
    it('renders no provider for an unrecognised code', async () => {
        const wrapper = await openFor('SUMSUB_VIA_FINCODE');

        expect(rendered(wrapper)).toEqual([]);
        expect(wrapper.find('[role="status"]').exists()).toBe(true);
    });
});

// Every provider declares sdkError and, until this was wired, nothing listened
// to it. A vendor failure - or a token endpoint answering 500, which is the
// common case - left the spinner turning with no message and no exit but the
// backdrop. These pin the whole path: the spinner goes, a message arrives, and
// there is a way out.
describe('DocumentTypeItem sdk failures', () => {
    beforeEach(() => vi.clearAllMocks());

    it.each([
        ['SUMSUB', 'Sumsub'],
        ['UPPASS', 'UpPass'],
        ['CYBRID', 'Persona'],
        ['SHUFTI', 'Shufti'],
        ['DIDIT', 'Didit'],
        ['SYSTEM', 'System'],
    ])('surfaces sdkError from %s instead of spinning forever', async (api, component) => {
        const wrapper = await openFor(api);
        expect(wrapper.find('[role="status"]').exists()).toBe(true);

        await wrapper.findComponent({name: component}).vm.$emit('sdkError', new Error('vendor exploded'));

        expect(wrapper.find('[role="status"]').exists()).toBe(false);
        expect(wrapper.find('[role="alert"]').exists()).toBe(true);
        expect(wrapper.get('[role="alert"]').text()).toContain('could not start your verification');
    });

    // getCustomerMessage's job: an API refusal written for a customer to read
    // beats anything we could invent, but a framework debug body must not leak.
    it('prefers the api message when it was written for a customer', async () => {
        const wrapper = await openFor('SUMSUB');

        await wrapper.findComponent({name: 'Sumsub'}).vm.$emit('sdkError', {
            response: {status: 422, data: {message: 'This document type is not available in your country.'}},
        });

        expect(wrapper.get('[role="alert"]').text()).toContain('not available in your country');
    });

    it('falls back to our wording rather than showing a framework trace', async () => {
        const wrapper = await openFor('SUMSUB');

        await wrapper.findComponent({name: 'Sumsub'}).vm.$emit('sdkError', {
            response: {status: 500, data: {
                message: 'No query results for model [App\\Models\\DocumentType] 0000',
                exception: 'Illuminate\\Database\\Eloquent\\ModelNotFoundException',
            }},
        });

        const text = wrapper.get('[role="alert"]').text();
        expect(text).toContain('could not start your verification');
        expect(text).not.toContain('No query results');
    });

    // The provider is unmounted while the error shows, so clearing it mounts a
    // fresh one that asks for a new token - which is what makes retry real
    // rather than cosmetic.
    it('remounts the provider on retry', async () => {
        const wrapper = await openFor('SUMSUB');
        await wrapper.findComponent({name: 'Sumsub'}).vm.$emit('sdkError', new Error('nope'));
        expect(rendered(wrapper)).toEqual([]);

        await wrapper.get('[role="alert"] button').trigger('click');

        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
        expect(rendered(wrapper)).toEqual(['Sumsub']);
        expect(wrapper.find('[role="status"]').exists()).toBe(true);
    });

    it('clears the error when the modal is closed and reopened', async () => {
        const wrapper = await openFor('SUMSUB');
        await wrapper.findComponent({name: 'Sumsub'}).vm.$emit('sdkError', new Error('nope'));

        const buttons = wrapper.findAll('[role="alert"] button');
        await buttons[buttons.length - 1].trigger('click');
        await wrapper.get('a').trigger('click');

        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
        expect(rendered(wrapper)).toEqual(['Sumsub']);
    });
});
