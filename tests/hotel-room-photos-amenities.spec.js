import {describe, expect, it} from "vitest";
import {mount} from "@vue/test-utils";
import HotelRooms from "@/views/Travel/Hotels/Partials/HotelRooms.vue";
import HotelRate from "@/models/travel/hotels/hotel_rate.js";
import {getRateGroups} from "@/composables/travel/hotels/hotel_utils.js";

// SD-1838. The supplier's catalogue gives each room its own photos and
// amenities, and the console sends them on every rate it can match to a room.
// One name can cover two rooms: the certification hotel lists two "Standard
// Double room"s whose photos and amenities differ. Grouping the rates by name
// alone would picture one room's rates with the other room's photos.
const photo = (room, position) => ({
    thumbnail: `https://cdn.test/${room}/${position}/240x240.jpg`,
    card: `https://cdn.test/${room}/${position}/640x400.jpg`,
    large: `https://cdn.test/${room}/${position}/1024x768.jpg`,
    xlarge: `https://cdn.test/${room}/${position}/x1220.jpg`,
});

const RIVER_VIEW = {
    room_photos: [photo('river', 1), photo('river', 2)],
    room_amenities: ['ROOM-AIR-CONDITIONING', 'ROOM-BATHROBE'],
};

const CITY_VIEW = {
    room_photos: [photo('city', 1)],
    room_amenities: ['ROOM-SAFE'],
};

const labels = {
    'NO-MEAL': 'Room only',
    'ROOM-AIR-CONDITIONING': 'Air conditioning',
    'ROOM-BATHROBE': 'Bathrobe',
    'ROOM-SAFE': 'Safe',
};

const rate = (id, roomName, total, room = {}) => HotelRate.getInstance({
    id,
    token: id,
    room_name: roomName,
    ...room,
    meal: 'NO-MEAL',
    allotment: 2,
    bookable: true,
    breakdown: [],
    total,
    total_decimal: (total / 100).toFixed(2),
    total_formatted: (total / 100).toFixed(2),
    total_currency_prefixed: `USD ${(total / 100).toFixed(2)}`,
    per_night: null,
    payable_at_property: null,
    cancellation: {status: 'non_refundable', free_until: null, costs_now: total},
});

const thumbnails = card => card.findAll('img').map(img => img.attributes('src'));

describe('a hotel rate carries its own room', () => {
    it('reads the room photos and amenities the console sends', () => {
        const room = rate('rt-1', 'Standard Double room', 50000, RIVER_VIEW);

        expect(room.roomPhotos).toEqual(RIVER_VIEW.room_photos);
        expect(room.roomAmenities).toEqual(['ROOM-AIR-CONDITIONING', 'ROOM-BATHROBE']);
    });

    it('has neither from a console that sends neither', () => {
        const room = rate('rt-1', 'Standard Double room', 50000);

        expect(room.roomPhotos).toEqual([]);
        expect(room.roomAmenities).toEqual([]);
    });
});

describe('rates are grouped by room, not by name', () => {
    const rates = () => [
        rate('rt-1', 'Standard Double room', 50000, RIVER_VIEW),
        rate('rt-2', 'Standard Double room', 45000, CITY_VIEW),
        rate('rt-3', 'Standard Double room', 60000, RIVER_VIEW),
    ];

    it('keeps two rooms that share a name apart', () => {
        const groups = getRateGroups(rates());

        expect(groups).toHaveLength(2);
        expect(groups.map(group => group.rates.map(item => item.id))).toEqual([['rt-2'], ['rt-1', 'rt-3']]);
        expect(groups[0].photos).toEqual(CITY_VIEW.room_photos);
        expect(groups[1].photos).toEqual(RIVER_VIEW.room_photos);
        expect(groups[1].amenities).toEqual(RIVER_VIEW.room_amenities);
    });

    it('gives each room a key of its own, since the name is not one', () => {
        const keys = getRateGroups(rates()).map(group => group.key);

        expect(new Set(keys).size).toBe(keys.length);
    });

    it('still groups rates with no room of their own by name', () => {
        const groups = getRateGroups([
            rate('rt-1', 'Junior Suite', 70000),
            rate('rt-2', 'Junior Suite', 65000),
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].rates.map(item => item.id)).toEqual(['rt-2', 'rt-1']);
        expect(groups[0].photos).toEqual([]);
        expect(groups[0].amenities).toEqual([]);
    });
});

describe('the rooms list shows each room its own photos and amenities', () => {
    it("puts each room's photos in its own card and in no other", () => {
        const wrapper = mount(HotelRooms, {props: {rates: [
            rate('rt-1', 'Standard Double room', 50000, RIVER_VIEW),
            rate('rt-2', 'Standard Double room', 45000, CITY_VIEW),
        ], labels}});

        const cards = wrapper.findAll('article');

        expect(cards).toHaveLength(2);
        expect(thumbnails(cards[0])).toEqual(['https://cdn.test/city/1/240x240.jpg']);
        expect(thumbnails(cards[1])).toEqual(['https://cdn.test/river/1/240x240.jpg', 'https://cdn.test/river/2/240x240.jpg']);
    });

    it('words each amenity from the labels and never shows its code', () => {
        const wrapper = mount(HotelRooms, {props: {rates: [
            rate('rt-1', 'Standard Double room', 50000, RIVER_VIEW),
            rate('rt-2', 'Standard Double room', 45000, CITY_VIEW),
        ], labels}});

        const cards = wrapper.findAll('article');

        expect(cards[0].text()).toContain('Safe');
        expect(cards[0].text()).not.toContain('Air conditioning');
        expect(cards[1].text()).toContain('Air conditioning');
        expect(cards[1].text()).toContain('Bathrobe');
        expect(wrapper.text()).not.toMatch(/ROOM-/);
    });

    it('shows no photos on a rate the console could not match to a room', () => {
        const wrapper = mount(HotelRooms, {props: {rates: [rate('rt-1', 'Junior Suite', 70000)], labels}});

        expect(wrapper.findAll('img')).toHaveLength(0);
    });

    it('shows four photos of a room and says how many more it has', () => {
        const room = {
            room_photos: [1, 2, 3, 4, 5, 6].map(position => photo('suite', position)),
            room_amenities: [],
        };
        const wrapper = mount(HotelRooms, {props: {rates: [rate('rt-1', 'Junior Suite', 70000, room)], labels}});

        expect(wrapper.findAll('img')).toHaveLength(4);
        expect(wrapper.text()).toContain('+2');
    });
});
