import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import {existsSync, readFileSync} from "node:fs";
import {createPinia, setActivePinia} from "pinia";
import {flushPromises, mount} from "@vue/test-utils";
import {createMemoryHistory, createRouter} from "vue-router";
import {fixture, fixtureResponse, mockApi} from "./fixtures.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));

// SD-1218. The hotels journey was unusable end to end because two client-side
// reads took the wrong shape: the destination lookup answers an envelope
// (regions, labels, is_featured) and was read as a bare array, so no city was
// ever offered; and a search hotel carries one cheapest_rate and a rate_count,
// not a rates[], so the results list threw "filter is not a function" on the
// first result. Beyond those, the hotel page led into a booking-attempt journey
// whose endpoints the api never served. These mount the real screens against
// responses captured from staging and walk what a customer would.
//
// Several views reach a machine, which calls useCustomerStore() at module
// scope, so Pinia is active before anything under src/views is imported.
setActivePinia(createPinia());

const axios = (await import('axios')).default;
const {default: IndexView} = await import('@/views/Travel/Hotels/IndexView.vue');
const {default: HotelView} = await import('@/views/Travel/Hotels/HotelView.vue');
const {default: SearchBar} = await import('@/views/Travel/Hotels/Partials/SearchBar.vue');
const {default: Region} = await import('@/models/travel/region.js');
const {getCriteria, useHotelUtils} = await import('@/composables/travel/hotels/hotel_utils.js');

const REGION = '01a0a6a5-ee4c-70bd-b0cc-376c185ad81d';
const SEARCH = '01a0a6be-9b2d-7085-af0e-4b860114e78a';
const CONRAD = '01a0a6a6-da6b-7176-b2a8-e5326b9bc714';

// The search bar lays its calendar out on a media query, which jsdom does not have.
beforeAll(() => {
    vi.stubGlobal('matchMedia', () => ({matches: false, addEventListener() {}, removeEventListener() {}}));
});

afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

const blank = {template: '<div />'};

async function makeRouter(path) {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            {path: '/travel/hotels', name: 'hotels', component: IndexView},
            {path: '/travel/hotel/:id/:slug', name: 'viewHotel', component: HotelView, props: route => ({id: route.params.id, slug: route.params.slug, search: route.query.search})},
            {path: '/travel/quote/:id', name: 'travelQuote', component: blank},
        ],
    });

    await router.push(path);
    await router.isReady();

    return router;
}

// What the results page hands the search bar, rendered flat so the test can
// read it without opening a headless combobox.
const SearchBarProbe = {
    name: 'SearchBar',
    props: ['criteria', 'region', 'regions', 'isLoading', 'isSearchingRegions', 'regionLabels', 'regionsFeatured', 'regionsError'],
    template: '<div data-probe="search-bar">{{ regions.map(r => r.name).join(",") }}|{{ regionsError }}|{{ regionLabels.CITY }}</div>',
};

async function mountResults(routes) {
    mockApi(axios, routes);

    const router = await makeRouter(`/travel/hotels?region=${REGION}&checkin=2026-10-01&checkout=2026-10-04`);
    const wrapper = mount(IndexView, {
        global: {
            plugins: [router],
            stubs: {CustomerLayout: {template: '<div><slot /></div>'}, SearchBar: SearchBarProbe},
        },
    });

    await flushPromises();

    return {wrapper, router};
}

describe('the destination lookup', () => {
    it('offers the cities the api answered with, read from its envelope', async () => {
        const {wrapper} = await mountResults({
            '/client/v1/travel/regions': 'travel-regions-los-angeles',
            '/client/v1/travel/hotels/search/region': 'travel-hotels-search-region',
        });

        const probe = wrapper.find('[data-probe="search-bar"]').text();

        expect(probe).toContain('Los Angeles');
        expect(probe).toContain('City');
        expect(probe).not.toContain('failed');
    });

    it('describes a city by its kind label and country, as the picker shows it', async () => {
        const regions = fixture('travel-regions-los-angeles');
        const wrapper = mount(SearchBar, {
            props: {
                criteria: getCriteria({}),
                regions: Region.getCollection(regions.regions),
                regionLabels: regions.labels,
            },
        });

        // The combobox only renders its list once opened.
        const buttons = wrapper.findAll('button');
        await buttons[0].trigger('click');
        await flushPromises();

        expect(wrapper.text()).toContain('Los Angeles');
        expect(wrapper.text()).toContain('City · United States');
    });

    it('tells a lookup that could not be made apart from an empty answer', async () => {
        const {wrapper} = await mountResults({
            '/client/v1/travel/regions': {name: 'error-500-account-verification-token-no-vendor-credentials', status: 502},
            '/client/v1/travel/hotels/search/region': 'travel-hotels-search-region',
        });

        expect(wrapper.find('[data-probe="search-bar"]').text()).toContain('failed');
    });
});

describe('the results list', () => {
    it('renders every hotel from its one cheapest rate without throwing', async () => {
        const {wrapper} = await mountResults({
            '/client/v1/travel/regions': 'travel-regions-los-angeles',
            '/client/v1/travel/hotels/search/region': 'travel-hotels-search-region',
        });

        const text = wrapper.text();

        expect(wrapper.findAll('article')).toHaveLength(2);
        expect(text).toContain('Charming Duplex Home');
        expect(text).toContain('Junior Suite');
        expect(text).toContain('447.01');
        expect(text).toContain('Conrad Los Angeles');
        expect(text).toContain('Standard Double room with balcony and with river view');
        expect(text).toContain('827.29');
        // The count the supplier had, since 246 was the region and two are here.
        expect(text).toContain('246');
        // A meal code is rendered through the response's labels, never prettified.
        expect(text).toContain('No meals included');
    });

    it('opens a hotel on the search it was found under, never straight to a quote', async () => {
        const {wrapper, router} = await mountResults({
            '/client/v1/travel/regions': 'travel-regions-los-angeles',
            '/client/v1/travel/hotels/search/region': 'travel-hotels-search-region',
        });
        const push = vi.spyOn(router, 'push').mockResolvedValue();

        await wrapper.findAll('article')[1].find('button').trigger('click');

        expect(push).toHaveBeenCalledTimes(1);
        expect(push.mock.calls[0][0]).toMatchObject({
            name: 'viewHotel',
            params: {id: CONRAD, slug: 'conrad-los-angeles'},
            query: {search: '01a0a6c7-5684-73ab-8ac4-396065b7e5fa'},
        });
    });

    it('says "we couldn\'t search" when the search fails, and "no hotels" when it finds none', async () => {
        const failed = await mountResults({
            '/client/v1/travel/regions': 'travel-regions-los-angeles',
            '/client/v1/travel/hotels/search/region': {name: 'error-500-account-verification-token-no-vendor-credentials', status: 502},
        });

        expect(failed.wrapper.text()).toContain("We couldn't load hotels");
        expect(failed.wrapper.text()).not.toContain('No hotels available');

        const empty = fixture('travel-hotels-search-region');
        empty.hotels = [];
        empty.total_hotels = 0;
        mockApi(axios, {'/client/v1/travel/regions': 'travel-regions-los-angeles'});
        axios.post.mockResolvedValue({status: 200, data: empty});

        const router = await makeRouter(`/travel/hotels?region=${REGION}&checkin=2026-10-01&checkout=2026-10-04`);
        const wrapper = mount(IndexView, {global: {plugins: [router], stubs: {CustomerLayout: {template: '<div><slot /></div>'}, SearchBar: SearchBarProbe}}});
        await flushPromises();

        expect(wrapper.text()).toContain('No hotels available');
        expect(wrapper.text()).not.toContain("We couldn't load hotels");
    });

    it('reports a failure of our own rather than dressing it as the api\'s', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        // A 200 whose body the mapper cannot read is our problem, not an outage.
        mockApi(axios, {'/client/v1/travel/regions': 'travel-regions-los-angeles'});
        axios.post.mockResolvedValue({status: 200, data: {hotels: null}});

        const router = await makeRouter(`/travel/hotels?region=${REGION}&checkin=2026-10-01&checkout=2026-10-04`);
        mount(IndexView, {global: {plugins: [router], stubs: {CustomerLayout: {template: '<div><slot /></div>'}, SearchBar: SearchBarProbe}}});
        await flushPromises();

        expect(error).toHaveBeenCalled();
        expect(String(error.mock.calls[0][0])).toContain('[travel search]');
    });
});

describe('the hotel page', () => {
    async function mountHotel(routes = {}) {
        mockApi(axios, {
            [`/client/v1/travel/hotel/${SEARCH}/${CONRAD}`]: 'travel-hotel-view',
            ...routes,
        });

        const router = await makeRouter(`/travel/hotel/${CONRAD}/conrad-los-angeles?search=${SEARCH}&region=${REGION}&checkin=2026-10-01&checkout=2026-10-04`);
        const wrapper = mount(HotelView, {
            props: {id: CONRAD, slug: 'conrad-los-angeles', search: SEARCH},
            global: {plugins: [router], stubs: {CustomerLayout: {template: '<div><slot /></div>'}}},
        });

        await flushPromises();

        return {wrapper, router};
    }

    it('shows the hotel, its rates, its charges and its description from the hotel response', async () => {
        const {wrapper} = await mountHotel();
        const text = wrapper.text();

        expect(text).toContain('Conrad Los Angeles');
        expect(text).toContain('100 South Grand Avenue');
        expect(text).toContain('Standard Double room with balcony and with river view');
        // The total and what it is made of, as the api rendered them.
        expect(text).toContain('AUD 827.29');
        expect(text).toContain('AUD 275.76');
        // Nine property charges, in the property's own currency.
        expect(text).toContain('Parking');
        expect(text).toContain('USD 10.00 per vehicle, per night');
        expect(text).toContain('Deposit');
        // The supplier's own prose, section by section.
        expect(text).toContain('At the hotel');
        expect(text).toContain('Room amenities');
        // Check-in and check-out as the hotel stated them, without the seconds
        // the api keeps them to (SD-1257).
        expect(text).toContain('Check in from 15:00 · check out by 12:00');
        expect(text).not.toContain('15:00:00');
    });

    it('holds the chosen rate and continues to the quote the api minted', async () => {
        const {wrapper, router} = await mountHotel({
            [`/client/v1/travel/hotel/quote/${SEARCH}/${CONRAD}`]: 'travel-quote-created',
        });
        const push = vi.spyOn(router, 'push').mockResolvedValue();

        const button = wrapper.findAll('button').find(b => b.text() === 'Continue');
        expect(button, 'the stay card offers Continue once the cheapest rate is picked').toBeTruthy();
        expect(button.attributes('disabled')).toBeUndefined();

        await button.trigger('click');
        await flushPromises();

        // POST /travel/hotel/quote/{search}/{hotel} with the rate's token, then
        // on to /travel/quote/{id} - the live journey, not a booking attempt.
        const quoteCall = axios.post.mock.calls.find(([url]) => url.includes('/travel/hotel/quote/'));
        expect(quoteCall[0]).toBe(`/client/v1/travel/hotel/quote/${SEARCH}/${CONRAD}`);
        expect(quoteCall[1]).toEqual({token: 'm-a5918870-e5c3-5203-8e29-f9eb28af7ea2'});
        expect(push).toHaveBeenCalledWith({name: 'travelQuote', params: {id: 'quote-conrad-1'}});
    });
});

describe('the dead booking-attempt journey is gone', () => {
    it('has no screen, no route and no endpoint left for it', () => {
        expect(existsSync('src/views/Travel/Hotels/QuoteView.vue')).toBe(false);
        expect(existsSync('src/views/Travel/Hotels/BookingDetailsView.vue')).toBe(false);

        const router = readFileSync('src/router/index.js', 'utf8');
        for (const name of ['hotelQuote', 'hotelBooking', 'hotelBookingDetails']) {
            expect(router, `route ${name} should be gone`).not.toContain(`'${name}'`);
        }

        // The four calls the api never served. The quote endpoint takes two ids;
        // the single-id form was the dead one.
        const utils = readFileSync('src/composables/travel/hotels/hotel_utils.js', 'utf8');
        expect(utils).not.toContain('/travel/hotel/book/');
        expect(utils).not.toContain('/travel/hotel/booking-attempt/');
        expect(utils).not.toMatch(/travel\/hotel\/quote\/\$\{[a-zA-Z]+\}`/);

        expect(Object.keys(useHotelUtils()).sort()).toEqual([
            'createQuote', 'criteria', 'getHotelView', 'getQuote', 'guestBreakdown', 'nights', 'regions', 'search', 'stayLabel',
        ]);
    });
});
