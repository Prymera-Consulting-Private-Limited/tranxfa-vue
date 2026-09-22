import {beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {createPinia, setActivePinia} from "pinia";
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
import {fixture, fixtureError} from "./fixtures.js";

// The vendor SDKs are never reached here - the token request fails first - but
// they are imported at module scope, so they still have to resolve.
vi.mock('@sumsub/websdk', () => ({default: {init: vi.fn()}}));
vi.mock('persona', () => ({default: {Client: vi.fn()}}));
vi.mock('@didit-protocol/sdk-web', () => ({
    DiditSdk: {shared: {startVerification: vi.fn(), destroy: vi.fn()}},
}));
vi.mock('@/router/index.js', () => ({default: {currentRoute: {value: {fullPath: '/account-verification'}}}}));

const getAccountVerificationToken = vi.fn();
vi.mock('@/composables/customer_utils.js', () => ({
    useCustomerUtils: () => ({getAccountVerificationToken}),
}));

setActivePinia(createPinia());

const {default: Sumsub} = await import("@/components/AccountVerification/Provider/Sumsub.vue");
const {default: UpPass} = await import("@/components/AccountVerification/Provider/UpPass.vue");
const {default: Shufti} = await import("@/components/AccountVerification/Provider/Shufti.vue");
const {default: Persona} = await import("@/components/AccountVerification/Provider/Persona.vue");
const {default: Didit} = await import("@/components/AccountVerification/Provider/Didit.vue");

function poiProps() {
    const poi = fixture('document-categories').find(c => c.code === 'POI');

    return {
        documentCategory: DocumentCategory.getInstance(poi),
        documentType: DocumentType.getInstance(poi.document_types[0]),
    };
}

// A token failure is the likeliest way any of these dies, and there is a
// captured fixture for exactly it: the backend answers 500 when a deployment
// holds no credentials for the vendor. Before this was handled the rejection
// escaped onMounted unhandled, so the component emitted nothing at all and the
// parent's spinner ran forever with nothing in the console.
describe('provider token failures', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        globalThis.Echo = {channel: () => ({listen: vi.fn()}), leaveChannel: vi.fn()};
    });

    it.each([
        ['Sumsub', () => Sumsub],
        ['UpPass', () => UpPass],
        ['Shufti', () => Shufti],
        ['Persona', () => Persona],
        ['Didit', () => Didit],
    ])('%s emits sdkError when the token request fails', async (name, component) => {
        getAccountVerificationToken.mockRejectedValue(
            fixtureError('error-500-account-verification-token-no-vendor-credentials', 500),
        );

        const wrapper = mount(component(), {props: poiProps()});
        await flushPromises();

        expect(wrapper.emitted('sdkError'), name).toBeTruthy();
        expect(wrapper.emitted('sdkInitialized'), name).toBeFalsy();
    });

    // The redirect providers must not announce themselves ready on a failed
    // token: sdkInitialized hides the parent's spinner, so emitting it here
    // would replace a hang with an empty modal and a dead Continue link.
    it.each([
        ['UpPass', () => UpPass],
        ['Shufti', () => Shufti],
    ])('%s does not subscribe to Echo after a failed token', async (name, component) => {
        getAccountVerificationToken.mockRejectedValue(fixtureError('error-401-profile', 401));
        const listen = vi.fn();
        globalThis.Echo = {channel: () => ({listen}), leaveChannel: vi.fn()};

        mount(component(), {props: poiProps()});
        await flushPromises();

        expect(listen, name).not.toHaveBeenCalled();
    });

    it('still reaches the SDK when the token succeeds', async () => {
        getAccountVerificationToken.mockResolvedValue({data: {token: 'https://uppass.test/session/abc'}});

        const wrapper = mount(UpPass, {props: poiProps()});
        await flushPromises();

        expect(wrapper.emitted('sdkError')).toBeFalsy();
        expect(wrapper.emitted('sdkInitialized')).toBeTruthy();
    });
});
