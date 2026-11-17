import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {readFileSync} from "node:fs";
import {createPinia, setActivePinia} from "pinia";
import {flushPromises, mount} from "@vue/test-utils";
import {createMemoryHistory, createRouter} from "vue-router";
import {fixture, mockApi} from "./fixtures.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));

// SD-1775. The hotel supplier confirmed on 15 October that residency is the
// country that issued the guests' passports: they price on it and can withhold
// rooms by it. The app sent 'AU' whenever the profile had no nationality, and
// could search before the profile had loaded at all. Now there is no default:
// the profile's nationality is used, a country the customer chose in the url
// wins over it, and with neither the customer is asked before anything is
// searched.
//
// The views reach a machine that calls useCustomerStore() at module scope, so
// Pinia is active before anything under src/views is imported.
setActivePinia(createPinia());

const axios = (await import('axios')).default;
const {default: IndexView} = await import('@/views/Travel/Hotels/IndexView.vue');
const {default: HotelView} = await import('@/views/Travel/Hotels/HotelView.vue');
const {default: PassportCountry} = await import('@/views/Travel/Hotels/Partials/PassportCountry.vue');
const {getCriteria, getQuery, useHotelUtils} = await import('@/composables/travel/hotels/hotel_utils.js');
const {useCustomerStore} = await import('@/stores/customer.js');
const {default: Customer} = await import('@/models/customer.js');

const REGION = '01a0a6a5-ee4c-70bd-b0cc-376c185ad81d';
const SEARCH = '01a0a6be-9b2d-7085-af0e-4b860114e78a';
const CONRAD = '01a0a6a6-da6b-7176-b2a8-e5326b9bc714';
const HOTEL_URL = `/client/v1/travel/hotel/${SEARCH}/${CONRAD}`;
const SEARCH_URL = '/client/v1/travel/hotels/search/region';
const ROUTES = {
    '/client/v1/countries': 'countries',
    '/client/v1/travel/regions': 'travel-regions-los-angeles',
    [SEARCH_URL]: 'travel-hotels-search-region',
};

// The search bar lays its calendar out on a media query, which jsdom does not have.
beforeAll(() => {
    vi.stubGlobal('matchMedia', () => ({matches: false, addEventListener() {}, removeEventListener() {}}));
});

beforeEach(() => {
    useCustomerStore().reset();
    mockApi(axios, ROUTES);
});

afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

// profile-05 carries an Australian nationality; profile-02 carries none.
function loadCustomer(name) {
    const store = useCustomerStore();
    store.customer.data = Customer.getInstance(fixture(name));
    store.isLoaded = true;
}

async function mountResults(query = '') {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{path: '/travel/hotels', name: 'hotels', component: IndexView}],
    });

    await router.push(`/travel/hotels?region=${REGION}&checkin=2026-10-01&checkout=2026-10-04${query}`);
    await router.isReady();

    const wrapper = mount(IndexView, {
        global: {
            plugins: [router],
            stubs: {CustomerLayout: {template: '<div><slot /></div>'}, SearchBar: {template: '<div />'}},
        },
    });

    await flushPromises();

    return {wrapper, router};
}

const searches = () => axios.post.mock.calls.filter(([url]) => url === SEARCH_URL);

// A hotel opened from the results, its url carrying the search it was found
// under. The dates are whatever the url parser accepts today, so the stay
// never ages into the past.
async function mountHotel(query = '') {
    const {checkin, checkout} = getCriteria({});
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            {path: '/travel/hotels', name: 'hotels', component: {template: '<div />'}},
            {path: '/travel/hotel/:id/:slug', name: 'viewHotel', component: HotelView},
        ],
    });

    await router.push(`/travel/hotel/${CONRAD}/conrad-los-angeles?search=${SEARCH}&region=${REGION}&checkin=${checkin}&checkout=${checkout}&guests=2${query}`);
    await router.isReady();

    const wrapper = mount(HotelView, {
        props: {id: CONRAD, slug: 'conrad-los-angeles', search: SEARCH},
        global: {plugins: [router], stubs: {CustomerLayout: {template: '<div><slot /></div>'}}},
    });

    await flushPromises();

    return {wrapper, router, checkin, checkout};
}

// Every link on the page that leads back to the results, as the query the
// results page would search with.
const waysBack = (wrapper, router) => wrapper.findAll('a')
    .map(link => router.resolve(link.attributes('href')))
    .filter(to => to.name === 'hotels')
    .map(to => to.query);

describe('the passport country in the url', () => {
    it('reads a two-letter code, upper-cased, and drops anything else', () => {
        expect(getCriteria({residency: 'gb'}).residency).toBe('GB');
        expect(getCriteria({residency: 'NZ'}).residency).toBe('NZ');
        expect(getCriteria({residency: 'GBR'}).residency).toBeNull();
        expect(getCriteria({residency: ['GB', 'NZ']}).residency).toBeNull();
        expect(getCriteria({}).residency).toBeNull();
    });

    it('is written only when the customer chose one, so a link never pins someone else\'s', () => {
        expect(getQuery(getCriteria({residency: 'gb'})).residency).toBe('GB');
        expect(getQuery(getCriteria({})).residency).toBeUndefined();
    });
});

describe('no country is ever guessed', () => {
    it('has no fallback country left in the hotel utils', () => {
        const source = readFileSync('src/composables/travel/hotels/hotel_utils.js', 'utf8');

        expect(source).not.toContain('DEFAULT_RESIDENCY');
        expect(source).not.toMatch(/residency[^\n]*\?\?\s*['"][A-Za-z]{2}['"]/);
    });

    it('will not search without one, whoever calls it', async () => {
        loadCustomer('profile-02-email-verified');
        const {criteria, search} = useHotelUtils();
        criteria.value = getCriteria({region: REGION});

        await expect(search()).rejects.toThrow('[travel search]');
        expect(searches()).toHaveLength(0);
    });
});

describe('the results page', () => {
    it('searches on the profile\'s nationality', async () => {
        loadCustomer('profile-05-onboarded');
        const {wrapper} = await mountResults();

        expect(searches()).toHaveLength(1);
        expect(searches()[0][1].residency).toBe('AU');
        expect(wrapper.findComponent(PassportCountry).props('residency')).toBe('AU');
    });

    it('searches on the country the customer chose, over the profile\'s', async () => {
        loadCustomer('profile-05-onboarded');
        await mountResults('&residency=gb');

        expect(searches()).toHaveLength(1);
        expect(searches()[0][1].residency).toBe('GB');
    });

    it('waits for the profile, then searches once on it', async () => {
        const {wrapper} = await mountResults();

        expect(searches()).toHaveLength(0);
        expect(wrapper.text()).toContain('Searching for hotels');

        loadCustomer('profile-05-onboarded');
        await flushPromises();

        expect(searches()).toHaveLength(1);
        expect(searches()[0][1].residency).toBe('AU');
    });

    it('asks for the passport country when the profile has none, and searches on the answer', async () => {
        loadCustomer('profile-02-email-verified');
        const {wrapper, router} = await mountResults();

        expect(searches()).toHaveLength(0);
        expect(wrapper.text()).toContain("Which country issued the guests' passports?");
        expect(wrapper.text()).not.toContain('No hotels available');

        const question = wrapper.findComponent(PassportCountry);
        expect(question.props('residency')).toBeNull();

        question.vm.$emit('update:residency', 'NZ');
        await flushPromises();

        expect(router.currentRoute.value.query.residency).toBe('NZ');
        expect(searches()).toHaveLength(1);
        expect(searches()[0][1].residency).toBe('NZ');
    });
});

// The hotel page's own "Back to results" rebuilt the search from four named
// parameters and left the passport country behind, so a customer who changed
// it went back to results priced for the profile's passports instead.
describe('the way back from a hotel', () => {
    it('keeps the passport country the customer chose, with the rest of the search', async () => {
        mockApi(axios, {...ROUTES, [HOTEL_URL]: 'travel-hotel-view'});
        const {wrapper, router, checkin, checkout} = await mountHotel('&residency=NZ');

        expect(waysBack(wrapper, router)).toEqual([
            {region: REGION, checkin, checkout, guests: '2', residency: 'NZ'},
        ]);
    });

    it('keeps it from the page that could not load the hotel too', async () => {
        axios.post.mockRejectedValue({response: {status: 404, data: {message: 'These results are out of date.'}}});
        const {wrapper, router} = await mountHotel('&residency=NZ');
        const back = waysBack(wrapper, router);

        expect(wrapper.text()).toContain("We couldn't load this hotel");
        expect(back).toHaveLength(2);
        back.forEach(query => expect(query.residency).toBe('NZ'));
    });

    it('does not write one the customer did not choose', async () => {
        loadCustomer('profile-05-onboarded');
        mockApi(axios, {...ROUTES, [HOTEL_URL]: 'travel-hotel-view'});
        const {wrapper, router} = await mountHotel();
        const [back] = waysBack(wrapper, router);

        expect(back.region).toBe(REGION);
        expect(back).not.toHaveProperty('residency');
    });
});
