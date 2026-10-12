import {beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {createPinia, setActivePinia} from "pinia";
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
import ReviewAnswer from "@/enums/review_answer.js";
import {fixture} from "./fixtures.js";

// A stand-in for the vendor SDK's builder chain. It records the handlers the
// component registers so a review can be delivered by hand, and counts destroy()
// so the teardown can be asserted.
const handlers = {};
const destroy = vi.fn();
const launch = vi.fn();
vi.mock('@sumsub/websdk', () => ({
    default: {
        init: () => {
            const chain = {
                withConf: () => chain,
                withOptions: () => chain,
                on: (event, cb) => { handlers[event] = cb; return chain; },
                build: () => ({launch, destroy}),
            };

            return chain;
        },
    },
}));

const getAccountVerificationToken = vi.fn();
vi.mock('@/composables/customer_utils.js', () => ({
    useCustomerUtils: () => ({getAccountVerificationToken}),
}));

setActivePinia(createPinia());
const {default: Sumsub} = await import("@/components/AccountVerification/Provider/Sumsub.vue");

function poiProps() {
    const poi = fixture('document-categories').find(c => c.code === 'POI');

    return {
        documentCategory: DocumentCategory.getInstance(poi),
        documentType: DocumentType.getInstance(poi.document_types[0]),
    };
}

async function mountSumsub() {
    getAccountVerificationToken.mockResolvedValue({data: {token: 'tok'}});
    const wrapper = mount(Sumsub, {props: poiProps()});
    await flushPromises();

    return wrapper;
}

describe('Sumsub review answers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        for (const k of Object.keys(handlers)) delete handlers[k];
    });

    it('reports a GREEN review as a completed verification', async () => {
        const wrapper = await mountSumsub();

        handlers['idCheck.onApplicantStatusChanged']({
            reviewStatus: 'completed',
            reviewResult: {reviewAnswer: ReviewAnswer.GREEN},
        });

        expect(wrapper.emitted('sdkApplicantStatusChanged')).toBeTruthy();
        expect(wrapper.emitted('sdkApplicantRejected')).toBeFalsy();
    });

    // The defect this file exists for. A RED review used to match neither
    // branch and emit nothing, so the modal sat there exactly as it does when
    // the SDK has hung - and the customer had no way to tell the difference.
    it('reports a RED review as a refusal rather than silence', async () => {
        const wrapper = await mountSumsub();

        handlers['idCheck.onApplicantStatusChanged']({
            reviewStatus: 'completed',
            reviewResult: {reviewAnswer: ReviewAnswer.RED, moderationComment: 'Blurred'},
        });

        expect(wrapper.emitted('sdkApplicantRejected')).toBeTruthy();
        expect(wrapper.emitted('sdkApplicantRejected')[0][0].reviewResult.moderationComment).toBe('Blurred');
        expect(wrapper.emitted('sdkApplicantStatusChanged'), 'a refusal is not a success').toBeFalsy();
    });

    // Anything not completed is the applicant still working through the flow.
    // Reporting those would send them onward mid-verification.
    it.each(['pending', 'queued', 'init', 'onHold'])('stays quiet on a %s review', async (reviewStatus) => {
        const wrapper = await mountSumsub();

        handlers['idCheck.onApplicantStatusChanged']({reviewStatus, reviewResult: {reviewAnswer: 'GREEN'}});

        expect(wrapper.emitted('sdkApplicantStatusChanged')).toBeFalsy();
        expect(wrapper.emitted('sdkApplicantRejected')).toBeFalsy();
    });

    // An unfamiliar answer is not an approval. Anything that is not explicitly
    // GREEN has to fall to the refusal side, or a future vendor value would
    // route an unverified customer onward.
    it('treats an unrecognised answer as a refusal, not an approval', async () => {
        const wrapper = await mountSumsub();

        handlers['idCheck.onApplicantStatusChanged']({
            reviewStatus: 'completed',
            reviewResult: {reviewAnswer: 'YELLOW'},
        });

        expect(wrapper.emitted('sdkApplicantStatusChanged')).toBeFalsy();
        expect(wrapper.emitted('sdkApplicantRejected')).toBeTruthy();
    });
});

describe('Sumsub teardown', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        for (const k of Object.keys(handlers)) delete handlers[k];
    });

    // The SDK mounts an iframe and keeps listeners of its own. This modal is
    // opened and closed repeatedly, so an instance left alive is one more
    // verification session running behind the visible one.
    it('destroys the SDK instance on unmount', async () => {
        const wrapper = await mountSumsub();
        expect(launch).toHaveBeenCalled();

        wrapper.unmount();

        expect(destroy).toHaveBeenCalledTimes(1);
    });

    // The token request failing means no instance was ever built. Tearing down
    // must not become a second error on the way out.
    it('unmounts cleanly when the SDK was never built', async () => {
        getAccountVerificationToken.mockRejectedValue(new Error('token failed'));
        const wrapper = mount(Sumsub, {props: poiProps()});
        await flushPromises();

        expect(() => wrapper.unmount()).not.toThrow();
        expect(destroy).not.toHaveBeenCalled();
    });
});

describe('ReviewAnswer enum', () => {
    // It previously declared the class and never exported it, so it could not be
    // imported at all - which is why the check was a bare string literal.
    it('is importable and mirrors the vendor values', () => {
        expect(ReviewAnswer.GREEN).toBe('GREEN');
        expect(ReviewAnswer.RED).toBe('RED');
    });
});
