import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import {createPinia, setActivePinia} from "pinia";
import {flushPromises, mount} from "@vue/test-utils";
import {createMemoryHistory, createRouter} from "vue-router";
import {fixture} from "./fixtures.js";
import {installFakeEcho} from "./helpers.js";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));

// SD-1257. Three things on the hotel screens read as unfinished to the
// supplier's reviewers: check-in times with seconds on them, a stay whose two
// ends were written in two formats with a midnight time on the second, and two
// rooms of two adults that read "2 adults · 2 adults".
setActivePinia(createPinia());

const axios = (await import('axios')).default;
const {
    formatHotelTime,
    getGuestBreakdown,
    getGuestSummary,
    getStayLabel,
} = await import('@/composables/travel/hotels/hotel_utils.js');
const {default: HotelDetail} = await import('@/models/travel/hotels/hotel_detail.js');
const {default: HotelSearch} = await import('@/models/travel/hotels/hotel_search.js');
const {default: Order} = await import('@/models/travel/orders/order.js');
const {default: HotelHeading} = await import('@/views/Travel/Hotels/Partials/HotelHeading.vue');
const {default: HotelStayCard} = await import('@/views/Travel/Hotels/Partials/HotelStayCard.vue');
const {default: HotelQuoteView} = await import('@/views/Travel/Hotels/HotelQuoteView.vue');
const {default: BookingCard} = await import('@/views/Travel/Bookings/Partials/BookingCard.vue');
const {default: ItemView} = await import('@/views/Travel/Bookings/ItemView.vue');

// Two rooms of two adults: the case the note was raised on.
const TWO_DOUBLES = {rooms: [{adults: 2, children_ages: []}, {adults: 2, children_ages: []}]};
const WITH_CHILD = {rooms: [{adults: 2, children_ages: []}, {adults: 2, children_ages: [7]}]};

const blank = {template: '<div />'};

beforeAll(() => {
    installFakeEcho();
});

afterEach(() => {
    vi.clearAllMocks();
});

async function mountWithRouter(component, props) {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            {path: '/', component: blank},
            {path: '/travel/hotels', name: 'hotels', component: blank},
            {path: '/travel/bookings', name: 'travelBookings', component: blank},
            {path: '/travel/booking/:id', name: 'travelBooking', component: blank},
            {path: '/travel/booking/:id/pay', name: 'travelBookingPayment', component: blank},
            {path: '/travel/booking/:id/payment', name: 'travelPaymentStatus', component: blank},
        ],
    });

    await router.push('/');
    await router.isReady();

    const wrapper = mount(component, {
        props,
        global: {
            plugins: [router],
            stubs: {CustomerLayout: {template: '<div><slot /></div>'}},
        },
    });

    await flushPromises();

    return wrapper;
}

describe('check-in and check-out times', () => {
    it('drops the seconds the api keeps them to', () => {
        expect(formatHotelTime('15:00:00')).toBe('15:00');
        expect(formatHotelTime('09:30:00')).toBe('09:30');
        expect(formatHotelTime('12:00')).toBe('12:00');
    });

    it('shows a value that is not a time as it came, and nothing for none', () => {
        expect(formatHotelTime('noon')).toBe('noon');
        expect(formatHotelTime(null)).toBeNull();
    });

    it('reads both on the hotel page as captured from the api', () => {
        const hotel = HotelDetail.getInstance(fixture('travel-hotel-view').hotel);
        const text = mount(HotelHeading, {props: {hotel}}).text();

        expect(hotel.checkInFrom).toBe('15:00:00');
        expect(text).toContain('Check in from 15:00 · check out by 12:00');
        expect(text).not.toContain(':00:00');
    });

    it('leaves out the half the hotel did not state', () => {
        const hotel = HotelDetail.getInstance({...fixture('travel-hotel-view').hotel, check_in_from: null});
        const text = mount(HotelHeading, {props: {hotel}}).text();

        expect(text).not.toContain('Check in from');
        expect(text).toContain('check out by 12:00');
    });
});

describe('the stay dates', () => {
    it('writes both ends in one format, with no time', () => {
        expect(getStayLabel('2026-10-15', '2026-10-18')).toBe('Thu 15 Oct – Sun 18 Oct 2026');
    });

    it('writes the year on both ends when the stay crosses one', () => {
        expect(getStayLabel('2026-12-30', '2027-01-02')).toBe('Wed 30 Dec 2026 – Sat 2 Jan 2027');
    });

    it('names the day it was written for when given a timestamp', () => {
        expect(getStayLabel('2026-10-15T00:00:00+10:00', '2026-10-18T00:00:00+10:00')).toBe('Thu 15 Oct – Sun 18 Oct 2026');
    });

    it('says nothing without both ends', () => {
        expect(getStayLabel('2026-10-15', null)).toBeNull();
        expect(getStayLabel(null, '2026-10-18')).toBeNull();
        expect(getStayLabel('soon', '2026-10-18')).toBeNull();
    });
});

describe('the occupancy', () => {
    const rooms = (occupancy) => occupancy.rooms.map(room => ({adults: room.adults, children: room.children_ages}));

    it('sums the rooms into one line where there is no space to list them', () => {
        expect(getGuestSummary(rooms(TWO_DOUBLES))).toBe('2 rooms · 4 adults');
        expect(getGuestSummary(rooms(WITH_CHILD))).toBe('2 rooms · 4 adults · 1 child');
    });

    it('does not count a single room', () => {
        expect(getGuestSummary([{adults: 1, children: []}])).toBe('1 adult');
        expect(getGuestSummary([{adults: 2, children: [4, 9]}])).toBe('2 adults · 2 children');
        expect(getGuestSummary([])).toBeNull();
    });

    it('labels each room when it lists them', () => {
        expect(getGuestBreakdown(rooms(WITH_CHILD))).toEqual(['Room 1: 2 adults', 'Room 2: 2 adults, 1 child']);
        expect(getGuestBreakdown([{adults: 2, children: []}])).toEqual(['2 adults']);
    });
});

describe('the screens the supplier reviews', () => {
    it('the hotel page summary panel', () => {
        const search = HotelSearch.getInstance({
            id: 'srch-1',
            check_in: '2026-10-15',
            check_out: '2026-10-18',
            nights: 3,
            occupancy: TWO_DOUBLES,
        });
        const text = mount(HotelStayCard, {props: {search}}).text();

        expect(text).toContain('Thu 15 Oct – Sun 18 Oct 2026');
        expect(text).toContain('3 nights');
        expect(text).toContain('2 rooms · 4 adults');
        expect(text).not.toContain('12:00 AM');
        expect(text).not.toContain('2 adults · 2 adults');
    });

    it('the quote', async () => {
        axios.get.mockResolvedValue({
            status: 200,
            // Still held, or the page shows only that the price has lapsed.
            data: {
                ...fixture('travel-quote-created'),
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                check_in: '2026-10-15',
                check_out: '2026-10-18',
                nights: 3,
                occupancy: TWO_DOUBLES,
            },
        });
        const text = (await mountWithRouter(HotelQuoteView, {quoteId: 'quote-1'})).text();

        expect(text).toContain('Thu 15 Oct – Sun 18 Oct 2026');
        expect(text).toContain('2 rooms · 4 adults');
        expect(text).not.toContain('12:00 AM');
        expect(text).not.toContain('2 adults · 2 adults');
    });

    it('the booking page, which has room to list each room', async () => {
        axios.get.mockResolvedValue({
            status: 200,
            data: {...fixture('travel-order-view-deposit-pending'), check_in: '2026-10-15', check_out: '2026-10-18', occupancy: WITH_CHILD},
        });
        const text = (await mountWithRouter(ItemView, {orderId: 'order-1'})).text();

        expect(text).toContain('Thu 15 Oct – Sun 18 Oct 2026');
        expect(text).toContain('Room 1: 2 adults · Room 2: 2 adults, 1 child');
        expect(text).not.toContain('12:00 AM');
    });

    it('a booking in the list', async () => {
        const order = Order.getInstance({...fixture('travel-order-view-deposit-pending'), check_in: '2026-10-15', check_out: '2026-10-18', occupancy: TWO_DOUBLES});
        const text = (await mountWithRouter(BookingCard, {order})).text();

        expect(text).toContain('Thu 15 Oct – Sun 18 Oct 2026');
        expect(text).toContain('2 rooms · 4 adults');
    });
});
