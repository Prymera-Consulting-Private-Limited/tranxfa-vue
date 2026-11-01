import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {flushPromises, mount, RouterLinkStub} from '@vue/test-utils';
import {createPinia, setActivePinia} from 'pinia';
import Customer from '@/models/customer.js';
import {fixture} from './fixtures.js';

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
vi.mock('@/router/index.js', () => ({default: {push: vi.fn(), currentRoute: {value: {query: {}}}}}));
vi.mock('@/components/CustomerLayout.vue', () => ({default: {name: 'CustomerLayout', template: '<div><slot /></div>'}}));

// SD-1223. The console lists every document category the customer's country
// accepts and they have not supplied, and marks the ones a transfer will really
// ask for `required`. A brand that sets VITE_VERIFICATION_REQUIRED_ONLY shows
// only those on the verification page; every other screen that asks for a
// document still reads the whole list.
//
// profile-06-kyc-approved: identity approved, address (POA) and source of funds
// (SOF) outstanding. It was captured before the console sent `required`, so it
// doubles as the older console.

const ADDRESS = '4cebd969-1c58-4338-941c-2be7eeb81cb3';
const SOURCE_OF_FUNDS = '87a5cd11-5883-4479-88f0-18e367a49860';

function profileMarked(flags) {
    const payload = fixture('profile-06-kyc-approved');
    for (const category of payload.pending_documents) {
        if (category.id in flags) {
            category.required = flags[category.id];
        }
    }
    return payload;
}

// Pinia before the views: their imports reach a store at module scope.
async function signIn(payload) {
    const pinia = createPinia();
    setActivePinia(pinia);
    const {useCustomerStore} = await import('@/stores/customer.js');
    const store = useCustomerStore();
    store.customer.data = Customer.getInstance(payload);
    store.isLoaded = true;
    return pinia;
}

async function mountVerificationPage(payload) {
    const pinia = await signIn(payload);
    const {default: IndexView} = await import('@/views/AccountVerification/IndexView.vue');
    const wrapper = mount(IndexView, {global: {plugins: [pinia], stubs: {RouterLink: RouterLinkStub}}});
    await flushPromises();
    return wrapper;
}

function categoriesOffered(wrapper) {
    return wrapper.findAllComponents(RouterLinkStub)
        .map(link => link.props('to'))
        .filter(to => to?.name === 'categoryView')
        .map(to => to.params.category);
}

describe('the verification page', () => {
    afterEach(() => vi.unstubAllEnvs());

    describe('with VITE_VERIFICATION_REQUIRED_ONLY on', () => {
        beforeEach(() => vi.stubEnv('VITE_VERIFICATION_REQUIRED_ONLY', 'true'));

        it('offers only the categories the console marks required', async () => {
            const wrapper = await mountVerificationPage(profileMarked({[ADDRESS]: false, [SOURCE_OF_FUNDS]: true}));

            expect(categoriesOffered(wrapper)).toEqual([SOURCE_OF_FUNDS]);
            expect(wrapper.text()).not.toContain('Proof of Address');
        });

        // A console older than SD-1223 sends no flag at all. Reading that as "not
        // required" would empty the page the day a brand turns the switch on.
        it('still offers a category the console says nothing about', async () => {
            const wrapper = await mountVerificationPage(profileMarked({[ADDRESS]: false}));

            expect(categoriesOffered(wrapper)).toEqual([SOURCE_OF_FUNDS]);
        });

        it('still shows the documents the customer has already uploaded', async () => {
            const wrapper = await mountVerificationPage(profileMarked({[ADDRESS]: false, [SOURCE_OF_FUNDS]: false}));

            expect(categoriesOffered(wrapper)).toEqual([]);
            expect(wrapper.text()).toContain('Proof of Identity');
        });
    });

    it('offers every category when the switch is off', async () => {
        vi.stubEnv('VITE_VERIFICATION_REQUIRED_ONLY', '');
        const wrapper = await mountVerificationPage(profileMarked({[ADDRESS]: false, [SOURCE_OF_FUNDS]: true}));

        expect(categoriesOffered(wrapper)).toEqual([ADDRESS, SOURCE_OF_FUNDS]);
    });
});

// The transfer wizard and a held transaction link straight to a category. The
// filter belongs to the verification page alone: if it reached the store, the
// category page would answer "nothing to upload" for exactly the document a
// transfer is waiting on.
describe('a category hidden from the verification page', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('still opens from a direct link', async () => {
        vi.stubEnv('VITE_VERIFICATION_REQUIRED_ONLY', 'true');
        const pinia = await signIn(profileMarked({[ADDRESS]: false, [SOURCE_OF_FUNDS]: true}));
        const {default: CategoryView} = await import('@/views/AccountVerification/CategoryView.vue');
        const wrapper = mount(CategoryView, {
            props: {id: ADDRESS},
            global: {plugins: [pinia], stubs: {DocumentTypeItem: true, CategoryDescription: true, RouterLink: RouterLinkStub}},
        });
        await flushPromises();

        expect(wrapper.text()).toContain('Proof of Address');
        expect(wrapper.findAll('document-type-item-stub').length).toBeGreaterThan(0);
    });
});
