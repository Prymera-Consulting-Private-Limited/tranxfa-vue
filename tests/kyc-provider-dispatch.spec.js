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
const marker = (name) => ({[`default`]: {name, template: `<div />`}});
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
