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

    // The supplier marks Conrad's cot PAID at USD 0.00, and it read "Available at
    // extra cost" beside a price of nothing.
    it('says an extra the hotel prices at nothing is included', () => {
        const {hotel, labels} = conrad();
        const shown = lines(render(hotel.charges, labels));

        expect(labels.PAID).toBe('Available at extra cost');
        expect(shown).toContainEqual(['Cot', 'Included']);
        expect(shown.filter(([, price]) => price === 'Available at extra cost')).toEqual([]);
    });

    // "Not available" and "Not stated" are answers of their own, and a zero
    // riding along with them does not make the extra free.
    it.each([
        ['NOT-AVAILABLE', 'Not available'],
        ['UNSPECIFIED', 'Not stated by the hotel'],
    ])('keeps %s in its own words at a price of nothing', (inclusion, words) => {
        const free = {amount: 0, amount_decimal: '0.00', amount_formatted: '0.00', amount_currency_prefixed: 'USD 0.00'};
        const wrapper = render([charge({type: 'PETS', inclusion, ...free})], {PETS: 'Pets', [inclusion]: words});

        expect(lines(wrapper)).toEqual([['Pets', words]]);
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

        // Ten USD charges, but the cot's is 0.00, which reads "Included" rather
        // than as a price.
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

// SD-1839. The console sends every rule the hotel states since 2026.10.11, not
// only those with a price, so an included breakfast or a no-show rule arrives
// with no amount at all. The supplier's review asks to see each one.
describe('every rule a hotel states', () => {
    const unpriced = {amount: null, amount_decimal: null, amount_formatted: null, amount_currency_prefixed: null};
    const labels = {MEAL: 'Meals', 'MEAL-BREAKFAST': 'Breakfast', INCLUDED: 'Included', 'NO-SHOW': 'No-show', UNSPECIFIED: 'Not stated by the hotel', PARKING: 'Parking', PAID: 'Available at extra cost'};

    it('lists a rule that carries no price in its own words', () => {
        const breakfast = charge({detail: 'MEAL-BREAKFAST', inclusion: 'INCLUDED', currency: null, ...unpriced});
        const noShow = charge({type: 'NO-SHOW', inclusion: 'UNSPECIFIED', currency: null, ...unpriced});

        expect(breakfast.amount.isStated).toBe(false);
        expect(lines(render([breakfast, noShow], labels))).toEqual([
            ['Meals · Breakfast', 'Included'],
            ['No-show', 'Not stated by the hotel'],
        ]);
    });

    it('heads the list as extras and conditions, since not all of it is a charge', () => {
        const wrapper = render([charge({inclusion: 'INCLUDED', currency: null, ...unpriced})], labels);

        expect(wrapper.find('h3').text()).toBe('Extras and conditions');
    });

    it('says only where there are prices that the hotel collects them', () => {
        const included = charge({inclusion: 'INCLUDED', currency: null, ...unpriced});

        expect(render([included], labels).find('header').text()).not.toContain('collected by the hotel');

        const parking = charge({type: 'PARKING', currency: 'EUR', amount: 1800, amount_decimal: '18.00', amount_formatted: '18.00', amount_currency_prefixed: 'EUR 18.00'});
        // A currency on an unpriced rule is not one anything is charged in.
        const header = render([parking, {...included, currency: 'JPY'}], labels).find('header').text();

        expect(header).toContain('Prices here are collected by the hotel rather than by us and charged in EUR, so they are not part of your total.');
        expect(header).not.toContain('JPY');
    });

    it('keeps the paragraphs of a rule apart', () => {
        const wrapper = mount(HotelHouseRules, {props: {rules: [{title: 'Pets', body: 'Pets are allowed.\n\nA fee applies per stay.'}]}});

        expect(wrapper.findAll('dd p').map(paragraph => paragraph.text())).toEqual(['Pets are allowed.', 'A fee applies per stay.']);
    });
});
