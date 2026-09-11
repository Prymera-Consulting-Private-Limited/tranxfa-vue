import {beforeEach, describe, expect, it, vi} from "vitest";
import {flushPromises, mount} from "@vue/test-utils";
import {createPinia, setActivePinia} from "pinia";
import axios from "axios";
import router from "@/router/index.js";
import {useCustomerStore} from "@/stores/customer.js";
import {installFakeEcho, modalStubs} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn(), currentRoute: {value: {fullPath: '/transfer/quote-1'}}}}));
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

    // Two of the sixteen 412 types the back office listed can only be cleared
    // by finishing the profile. They used to read as a refusal.
    it('sends a customer with an unverified mobile number to onboarding', async () => {
        const router = (await import('@/router/index.js')).default;
        const wrapper = await mountWizard();
        wrapper.vm.isStepProcessing = true;
        axios.post.mockRejectedValue({response: {status: 412, data: {type: 'unverified_customer_mobile_number', message: 'Verify your mobile number first.'}}});
        await wrapper.vm.confirmQuote();
        expect(wrapper.vm.isStepProcessing).toBe(false);
        expect(router.push).toHaveBeenCalledWith(expect.objectContaining({name: 'onboardingWorkflow'}));
    });

    it('sends a customer with an incomplete identity to onboarding', async () => {
        const router = (await import('@/router/index.js')).default;
        const wrapper = await mountWizard();
        axios.post.mockRejectedValue({response: {status: 412, data: {type: 'incomplete_customer_identity', message: 'Complete your details.'}}});
        await wrapper.vm.confirmQuote();
        expect(router.push).toHaveBeenCalledWith(expect.objectContaining({name: 'onboardingWorkflow'}));
    });

    it('returns to the recipient step when the quote has no recipient', async () => {
        const wrapper = await mountWizard();
        wrapper.vm.isStepProcessing = true;
        axios.post.mockRejectedValue({response: {status: 412, data: {type: 'missing_recipient', message: 'Choose a recipient.'}}});
        await wrapper.vm.confirmQuote();
        expect(wrapper.vm.isStepProcessing).toBe(false);
        expect(wrapper.vm.preconditionFailedMessage).toBe('Choose a recipient.');
    });

    it('collects field errors for a 422 and stops processing', async () => {
        const wrapper = await mountWizard();
        wrapper.vm.isStepProcessing = true;
        axios.post.mockRejectedValue({response: {status: 422, data: {errors: {purpose_id: ['Required.']}}}});
        await wrapper.vm.confirmQuote();
        expect(wrapper.vm.isStepProcessing).toBe(false);
        expect(wrapper.vm.confirmFormErrors).toEqual({purpose_id: ['Required.']});
    });

    it('shows the server message for a 412 type it does not recognise and stops processing', async () => {
        const wrapper = await mountWizard();
        wrapper.vm.isStepProcessing = true;
        axios.post.mockRejectedValue({response: {status: 412, data: {type: 'partner_onboarding_incomplete', message: 'Fincode needs more information before this transfer.'}}});
        await wrapper.vm.confirmQuote();
        expect(wrapper.vm.isStepProcessing).toBe(false);
        expect(wrapper.vm.preconditionFailedMessage).toBe('Fincode needs more information before this transfer.');
    });

    it('falls back to generic copy for an unrecognised 412 without a message', async () => {
        const wrapper = await mountWizard();
        wrapper.vm.isStepProcessing = true;
        axios.post.mockRejectedValue({response: {status: 412, data: {type: 'partner_onboarding_incomplete'}}});
        await wrapper.vm.confirmQuote();
        expect(wrapper.vm.isStepProcessing).toBe(false);
        expect(wrapper.vm.preconditionFailedMessage).toBe('We could not confirm this transfer. Please try again.');
    });

    // The API reference's double-payment rule: after a 5xx or a request that
    // never answered, the transfer may exist. The wizard checks the list
    // before it lets the customer press Confirm again.
    it('re-checks the transfers after a 5xx and, finding none, says the transfer was not created', async () => {
        const wrapper = await mountWizard();
        wrapper.vm.isStepProcessing = true;
        axios.post.mockRejectedValue({request: {}, response: {status: 503, data: {message: 'Service unavailable.'}}});
        axios.get.mockResolvedValue({data: {data: []}});
        await wrapper.vm.confirmQuote();
        expect(wrapper.vm.isStepProcessing).toBe(false);
        expect(axios.get).toHaveBeenCalledWith('/client/v1/transactions', expect.objectContaining({params: expect.objectContaining({limit: 5})}));
        expect(wrapper.vm.outcomeUnknown).toBe(false);
        expect(wrapper.vm.preconditionFailedMessage).toBe('Your transfer was not created. Nothing has been charged. You can confirm it again.');
    });

    it('goes to the payment page when the unanswered confirm did create the transfer', async () => {
        const wrapper = await mountWizard();
        wrapper.vm.quote.data.recipient = {id: 'r-1'};
        wrapper.vm.quote.data.paymentCurrency = {id: 'EUR'};
        wrapper.vm.quote.data.localAmount = 100;
        axios.post.mockRejectedValue({request: {}, message: 'timeout of 30000ms exceeded'});
        axios.get.mockResolvedValue({data: {data: [{
            id: 'txn-9', created_at: new Date().toISOString(), local_amount: 100,
            payment_currency: {id: 'EUR'}, recipient: {id: 'r-1'}, state: {code: 'PENDING-PAYMENT'},
        }]}});
        await wrapper.vm.confirmQuote();
        expect(router.push).toHaveBeenCalledWith({name: 'makePayment', params: {transactionId: 'txn-9'}});
        expect(wrapper.vm.outcomeUnknown).toBe(false);
    });

    it('keeps Confirm hidden while the list itself cannot be fetched', async () => {
        const wrapper = await mountWizard();
        axios.post.mockRejectedValue({request: {}, message: 'Network Error'});
        axios.get.mockRejectedValue({request: {}, message: 'Network Error'});
        await wrapper.vm.confirmQuote();
        expect(wrapper.vm.isStepProcessing).toBe(false);
        expect(wrapper.vm.outcomeUnknown).toBe(true);
        expect(wrapper.vm.showContinueButton).toBe(false);
        expect(wrapper.vm.reconcileFailure).toMatch(/Check your transfers before confirming again/);
    });

    it('treats an error that was never sent as a plain refusal', async () => {
        const wrapper = await mountWizard();
        wrapper.vm.isStepProcessing = true;
        axios.post.mockRejectedValue(new Error('Network Error'));
        await wrapper.vm.confirmQuote();
        expect(wrapper.vm.isStepProcessing).toBe(false);
        expect(wrapper.vm.outcomeUnknown).toBe(false);
        expect(wrapper.vm.preconditionFailedMessage).toBe('We could not confirm this transfer. Please try again.');
    });

    // 412 more_authentication_required: the quote stays persisted, so the
    // picks are kept for the return trip and the same quote is confirmed again.
    it('keeps the confirm choices when the session needs MFA again', async () => {
        sessionStorage.clear();
        const wrapper = await mountWizard();
        wrapper.vm.thirdPartyDeclarationAccepted = true;
        axios.post.mockRejectedValue({request: {}, response: {status: 412, data: {type: 'more_authentication_required', message: 'More authentication required.'}}});
        await wrapper.vm.confirmQuote();
        expect(wrapper.vm.isStepProcessing).toBe(false);
        expect(JSON.parse(sessionStorage.getItem('checkout-draft:quote-1'))).toEqual({
            purposeId: 'purpose-1', paymentMethodId: 'pm-1', thirdPartyDeclarationAccepted: true, paymentData: {},
        });
    });

    it('restores the choices and says so when the wizard loads with a draft', async () => {
        sessionStorage.setItem('checkout-draft:quote-1', JSON.stringify({purposeId: 'p-9', paymentMethodId: 'pm-9', thirdPartyDeclarationAccepted: true, paymentData: {}}));
        axios.get.mockResolvedValue({data: {...quotePayload, purposes: [{id: 'p-9', title: 'Gift'}], payment_methods: [{id: 'pm-9', code: 'CARD', providers: [{id: 'pp', code: 'BELMONEY-CARD', payment_data_attributes: []}]}]}});
        const customerStore = useCustomerStore(pinia);
        customerStore.isLoaded = true;
        customerStore.customer.data = {addressInformationRequired: () => false, pendingDocuments: [], isBlockedForSending: false};
        const wrapper = mount(IndexView, {props: {id: 'quote-1'}, global: {plugins: [pinia], stubs: wizardStubs}});
        await flushPromises();
        expect(wrapper.vm.resumedAfterMfa).toBe(true);
        expect(wrapper.vm.purpose?.id).toBe('p-9');
        expect(wrapper.vm.paymentMethod?.id).toBe('pm-9');
        expect(wrapper.vm.thirdPartyDeclarationAccepted).toBe(true);
        expect(sessionStorage.getItem('checkout-draft:quote-1')).toBeNull();
    });
});
