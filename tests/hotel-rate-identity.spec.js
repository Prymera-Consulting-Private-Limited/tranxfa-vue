import {describe, expect, it} from "vitest";
import {toRaw} from "vue";
import {mount} from "@vue/test-utils";
import HotelRooms from "@/views/Travel/Hotels/Partials/HotelRooms.vue";
import HotelRate from "@/models/travel/hotels/hotel_rate.js";

// SD-1219. A rate's token is the supplier's match key for an offer, and the
// api deliberately gives near-identical rates the same one - the Conrad's 18
// rates carried 12. The rooms list keyed and selected rows by token, so one
// click lit three rows. A row is identified by which row it is; the token is
// only what the quote is asked for.
const rate = (roomName, token, total) => HotelRate.getInstance({
    token,
    room_name: roomName,
    meal: 'NO-MEAL',
    allotment: 2,
    bookable: true,
    breakdown: [],
    total,
    total_decimal: (total / 100).toFixed(2),
    total_formatted: (total / 100).toFixed(2),
    total_currency_prefixed: `AUD ${(total / 100).toFixed(2)}`,
    per_night: null,
    payable_at_property: null,
    cancellation: {status: 'non_refundable', free_until: null, costs_now: total},
});

// Three rows, two of them sharing a token, exactly as staging serves them.
const rates = () => [
    rate('Standard Double room with balcony', 'm-shared', 82729),
    rate('Standard Double room', 'm-shared', 82729),
    rate('Deluxe King', 'm-other', 90000),
];

const selectedButtons = wrapper => wrapper.findAll('button').filter(b => b.text() === 'Selected');

describe('HotelRooms identifies a rate by its row, not its token', () => {
    it('marks only the row that was chosen when two rows share a token', async () => {
        const list = rates();
        const wrapper = mount(HotelRooms, {props: {rates: list, selected: list[1]}});

        const selected = selectedButtons(wrapper);
        expect(selected).toHaveLength(1);
        // The chosen row, by position, not the first row wearing that token.
        expect(wrapper.findAll('li')[1].text()).toContain('Selected');
        expect(wrapper.findAll('li')[0].text()).not.toContain('Selected');
    });

    it('puts one lowest-price marker on the page, not one per row sharing the cheapest token', () => {
        const wrapper = mount(HotelRooms, {props: {rates: rates(), selected: null}});

        expect(wrapper.text().match(/Lowest price/g)).toHaveLength(1);
    });

    it('emits the very row that was clicked, so the quote carries its token and its description', async () => {
        const list = rates();
        const wrapper = mount(HotelRooms, {props: {rates: list, selected: null}});

        const buttons = wrapper.findAll('button').filter(b => b.text() === 'Select');
        await buttons[1].trigger('click');

        // Props arrive as reactive proxies, so identity is checked on the raw rate.
        expect(toRaw(wrapper.emitted('select')[0][0])).toBe(list[1]);
    });
});
