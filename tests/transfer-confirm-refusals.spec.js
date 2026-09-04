import {beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {createPinia, setActivePinia} from "pinia";
import axios from "axios";
import {useCustomerStore} from "@/stores/customer.js";
import {installFakeEcho, modalStubs} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn()}}));
vi.mock('@/components/CustomerLayout.vue', () => ({default: {name: 'CustomerLayout', template: '<div><slot /></div>'}}));

// The wizard's navigation machine calls useCustomerStore() at module scope,
// so a pinia must be active before the view is even imported.
const pinia = createPinia();
setActivePinia(pinia);
const {default: IndexView} = await import("@/views/Transfer/IndexView.vue");

const wizardStubs = {
    ...modalStubs,
    Progress: true,
    RecipientListing: true,
    RecipientCardShimmer: true,
    AddRecipientWizard: true,
    QuoteDisplay: true,
    Confirm: true,
    CustomerAttributeForm: true,
    DocumentTypeItem: true,
    CategoryDescription: true,
    SpendOtpModal: true,
    TermsModal: true,
    TopUpFlow: true,
    VSelect: true,
    RadioGroup: true,
    RadioGroupOption: true,
};

const quotePayload = {
    id: 'quote-1',
    amount: '100',
    amount_type: 'SEND',
    recipients: [],
    purposes: [],
    payment_methods: [],
    pending_documents: [],
};

async function mountWizard() {
    const customerStore = useCustomerStore(pinia);
    customerStore.isLoaded = true;
    customerStore.customer.data = {
        addressInformationRequired: () => false,
        pendingDocuments: [],
        isBlockedForSending: false,
    };
    axios.get.mockResolvedValue({data: quotePayload});
    const wrapper = mount(IndexView, {
        props: {id: 'quote-1'},
        global: {plugins: [pinia], stubs: wizardStubs},
    });
    await flushPromises();
    wrapper.vm.purpose = {id: 'purpose-1', title: 'Family support'};
    wrapper.vm.paymentMethod = {id: 'pm-1', code: 'OPEN-BANKING', providers: [{id: 'pp-1', code: 'FINCODE', paymentDataAttributes: []}]};
    await flushPromises();
    return wrapper;
}

// Characterization: the "characterizes" cases assert the behaviour shipped
// today — the confirm catch only resets the processing spinner for the error
// shapes it knows.
describe('Transfer wizard confirm refusals', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        installFakeEcho();
    });

    it('shows the server message for a known 412 refusal and stops processing', async () => {
        const wrapper = await mountWizard();
        wrapper.vm.isStepProcessing = true;
        axios.post.mockRejectedValue({response: {status: 412, data: {type: 'duplicate_transaction', message: 'You already have this transfer in flight.'}}});
        await wrapper.vm.confirmQuote();
        expect(wrapper.vm.isStepProcessing).toBe(false);
        expect(wrapper.vm.preconditionFailedMessage).toBe('You already have this transfer in flight.');
    });

    it('collects field errors for a 422 and stops processing', async () => {
        const wrapper = await mountWizard();
        wrapper.vm.isStepProcessing = true;
        axios.post.mockRejectedValue({response: {status: 422, data: {errors: {purpose_id: ['Required.']}}}});
        await wrapper.vm.confirmQuote();
        expect(wrapper.vm.isStepProcessing).toBe(false);
        expect(wrapper.vm.confirmFormErrors).toEqual({purpose_id: ['Required.']});
    });

    it('characterizes: a 412 with an unrecognised type leaves the spinner on with no message', async () => {
        const wrapper = await mountWizard();
        wrapper.vm.isStepProcessing = true;
        axios.post.mockRejectedValue({response: {status: 412, data: {type: 'partner_onboarding_incomplete', message: 'Fincode needs more information before this transfer.'}}});
        await wrapper.vm.confirmQuote();
        expect(wrapper.vm.isStepProcessing).toBe(true);
        expect(wrapper.vm.preconditionFailedMessage).toBe('');
    });

    it('characterizes: a non-412/422 failure leaves the spinner on with no message', async () => {
        const wrapper = await mountWizard();
        wrapper.vm.isStepProcessing = true;
        axios.post.mockRejectedValue({response: {status: 503, data: {message: 'Service unavailable.'}}});
        await wrapper.vm.confirmQuote();
        expect(wrapper.vm.isStepProcessing).toBe(true);
        expect(wrapper.vm.preconditionFailedMessage).toBe('');
    });

    it('characterizes: a network error throws inside the catch', async () => {
        const wrapper = await mountWizard();
        wrapper.vm.isStepProcessing = true;
        axios.post.mockRejectedValue(new Error('Network Error'));
        await expect(wrapper.vm.confirmQuote()).rejects.toThrow(TypeError);
        expect(wrapper.vm.isStepProcessing).toBe(true);
    });
});
