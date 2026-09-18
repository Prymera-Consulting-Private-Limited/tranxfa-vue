import {afterEach, describe, expect, it, vi} from "vitest";
import {mount} from "@vue/test-utils";
import {fixture} from "./fixtures.js";
import HotelDetail from "@/models/travel/hotels/hotel_detail.js";
import HouseRuleCharge from "@/models/travel/hotels/house_rule_charge.js";
import HotelHouseRules from "@/views/Travel/Hotels/Partials/HotelHouseRules.vue";

// SD-1259. The supplier's certification review asks for a hotel's extras to be
// clearly visible, and Conrad Los Angeles read "Meals USD 3.00" and "Meals
// USD 5.00" with nothing to tell them apart. The console now sends which one
// of its kind each charge is and the ages it covers (SD-1256), and stops
// dropping its euro, children's and check-out charges: 18 lines where there
// were 9. travel-hotel-view-extras is that hotel as console PR #638 lists it,
// written by hand until staging carries it - see tests/fixtures/README.md.

afterEach(() => {
    vi.restoreAllMocks();
});

function conrad() {
    const response = fixture('travel-hotel-view-extras');

    return {hotel: HotelDetail.getInstance(response.hotel), labels: response.labels};
}

function render(charges, labels) {
    return mount(HotelHouseRules, {props: {charges, labels}});
}

// Each line as a customer reads it: the name on the left, the price on the right.
function lines(wrapper) {
    return wrapper.findAll('li').map((row) => {
        const parts = row.findAll(':scope > span');

        return [parts[0].text().replace(/\s+/g, ' '), parts[parts.length - 1].text()];
    });
}

const charge = (overrides) => HouseRuleCharge.getInstance({
    type: 'MEAL',
    detail: null,
    applies_from_age: null,
    applies_to_age: null,
    inclusion: 'PAID',
    charge_unit: null,
    currency: 'USD',
    amount: 300,
    amount_decimal: '3.00',
    amount_formatted: '3.00',
    amount_currency_prefixed: 'USD 3.00',
    ...overrides,
});

describe('a hotel\'s extras', () => {
    it('lists every charge the hotel makes, one line each', () => {
        const {hotel, labels} = conrad();

        expect(hotel.charges).toHaveLength(18);
        expect(lines(render(hotel.charges, labels))).toHaveLength(18);
    });

    it('reads each line as type, then which one, then the ages, beside its own price', () => {
        const {hotel, labels} = conrad();
        const shown = lines(render(hotel.charges, labels));

        // The handout's own examples.
        expect(shown).toEqual(expect.arrayContaining([
            ['Meals · Breakfast', 'USD 3.00'],
            ['Meals · Lunch', 'USD 5.00'],
            ['Children\'s meals · Breakfast (ages 0–5)', 'USD 10.00'],
            ['Children\'s meals · Breakfast (ages 6–12)', 'USD 14.00'],
            ['Children (ages 0–3)', 'USD 20.00'],
            ['Shuttle · Airport', 'EUR 20.00'],
            ['Deposit · Keys', 'USD 10.00 per room, per stay'],
            ['Additional fee · Luggage storage', 'EUR 2.00 per hour'],
            ['Check-in and check-out · Late checkout', 'EUR 10.00'],
        ]));
    });

    it('says nothing more than the type when nothing tells a charge apart', () => {
        const {hotel, labels} = conrad();
        const shown = lines(render(hotel.charges, labels));

        expect(shown).toContainEqual(['Parking', 'USD 10.00 per vehicle, per night']);
        expect(shown).toContainEqual(['Deposit', 'EUR 123.00 per room, per stay']);
        expect(shown.filter(([name]) => name.endsWith('·'))).toEqual([]);
    });

    it('reads the detail\'s words from the labels, never from its code', () => {
        const wrapper = render(
            [charge({detail: 'MEAL-DINNER'})],
            {MEAL: 'Meals', 'MEAL-DINNER': 'Evening meal', PAID: 'Available at extra cost'},
        );

        expect(lines(wrapper)).toEqual([['Meals · Evening meal', 'USD 3.00']]);
    });

    it('quotes a hotel that states only one end of the ages as it stated it', () => {
        const labels = {'CHILDREN-MEAL': 'Children\'s meals', 'CHILDREN-MEAL-BREAKFAST': 'Breakfast'};
        const kids = (from, to) => charge({type: 'CHILDREN-MEAL', detail: 'CHILDREN-MEAL-BREAKFAST', applies_from_age: from, applies_to_age: to});

        expect(lines(render([kids(6, null)], labels))[0][0]).toBe('Children\'s meals · Breakfast (from 6)');
        expect(lines(render([kids(null, 12)], labels))[0][0]).toBe('Children\'s meals · Breakfast (up to 12)');
        expect(lines(render([kids(4, 4)], labels))[0][0]).toBe('Children\'s meals · Breakfast (age 4)');
        expect(lines(render([kids(null, null)], labels))[0][0]).toBe('Children\'s meals · Breakfast');
    });

    it('keeps each charge in its own currency, and never adds them up', () => {
        const {hotel, labels} = conrad();
        const wrapper = render(hotel.charges, labels);
        const prices = lines(wrapper).map(([, price]) => price);

        // Ten USD charges, but the cot's is 0.00, which reads as its inclusion
        // rather than as a price.
        expect(prices.filter(price => price.startsWith('USD '))).toHaveLength(9);
        expect(prices.filter(price => price.startsWith('EUR '))).toHaveLength(8);
        // The header names both currencies, and there is a line per charge and
        // no more, so nothing on the list is a sum of the others.
        expect(wrapper.find('header').text()).toContain('EUR');
        expect(wrapper.find('header').text()).toContain('USD');
        expect(prices).toHaveLength(hotel.charges.length);
    });

    it('gives two charges of one type a line each, not one shared identity', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const {hotel, labels} = conrad();
        const wrapper = render(hotel.charges, labels);

        // A key only matters when the list is patched, which is when a key
        // shared by two meals, two shuttles or three deposits lets one row be
        // reused for another.
        const reordered = [...hotel.charges].reverse();
        await wrapper.setProps({charges: reordered});

        expect(warn.mock.calls.flat().join('\n')).not.toMatch(/Duplicate keys/);
        expect(lines(wrapper)).toEqual(lines(render(reordered, labels)));
    });
});
