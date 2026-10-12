import {afterEach, describe, expect, it, vi} from "vitest";
import {mount} from "@vue/test-utils";
import PropertyCharge from "@/models/travel/property_charge.js";
import HotelRate from "@/models/travel/hotels/hotel_rate.js";
import TravelQuote from "@/models/travel/quote.js";
import PayableAtProperty from "@/views/Travel/Hotels/Partials/PayableAtProperty.vue";
import HotelRooms from "@/views/Travel/Hotels/Partials/HotelRooms.vue";
import HotelPrice from "@/views/Travel/Hotels/Partials/HotelPrice.vue";

// SD-1249. payable_at_property used to be one amount converted into the
// customer's currency. It is now a list, one entry per charge, each in the
// property's own currency and never converted, because that is what the guest
// pays at the desk. These are the two charges the backend's handout uses: two
// currencies, one of which takes no decimal places.
const charges = () => [
    {
        name: 'city_tax',
        currency: 'USD',
        amount: 1500,
        amount_decimal: '15.00',
        amount_formatted: '15.00',
        amount_currency_prefixed: 'USD 15.00',
    },
    {
        name: 'resort_fee',
        currency: 'JPY',
        amount: 4000,
        amount_decimal: '4000',
        amount_formatted: '4,000',
        amount_currency_prefixed: 'JPY 4,000',
    },
];

// The shape every rate carried before SD-1245.
const legacy = {
    payable_at_property: 13400,
    payable_at_property_decimal: '134.00',
    payable_at_property_formatted: '134.00',
    payable_at_property_currency_prefixed: 'AUD 134.00',
};

const rate = (overrides = {}) => HotelRate.getInstance({
    id: 'rate-1',
    token: 'm-1',
    room_name: 'Standard Double room with balcony and with river view (full double bed)',
    meal: 'NO-MEAL',
    allotment: 2,
    bookable: true,
    breakdown: [],
    total: 82729,
    total_decimal: '827.29',
    total_formatted: '827.29',
    total_currency_prefixed: 'AUD 827.29',
    per_night: null,
    payable_at_property: charges(),
    cancellation: {status: 'non_refundable', free_until: null, costs_now: 82729},
    ...overrides,
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('PropertyCharge.getCollection', () => {
    it('keeps each charge in its own currency, with its own minor units', () => {
        const [cityTax, resortFee] = PropertyCharge.getCollection(charges());

        expect(cityTax.name).toBe('city_tax');
        expect(cityTax.currency).toBe('USD');
        expect(cityTax.amount.amount).toBe(1500);
        expect(cityTax.amount.currencyPrefixed).toBe('USD 15.00');

        // A zero-decimal currency: 4000 minor units is 4000 yen, not 40.
        expect(resortFee.currency).toBe('JPY');
        expect(resortFee.amount.major).toBe(4000);
        expect(resortFee.amount.currencyPrefixed).toBe('JPY 4,000');
    });

    it('owes nothing when the list is empty or absent', () => {
        expect(PropertyCharge.getCollection([])).toEqual([]);
        expect(PropertyCharge.getCollection(null)).toEqual([]);
        expect(PropertyCharge.getCollection(undefined)).toEqual([]);
    });

    it('reports the old single amount rather than rendering it', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(PropertyCharge.getCollection(legacy.payable_at_property)).toEqual([]);
        expect(error).toHaveBeenCalledOnce();
    });
});

describe('payable_at_property on the models that carry it', () => {
    it('is a list of charges on a hotel rate', () => {
        const mapped = rate();

        expect(mapped.payableAtProperty).toHaveLength(2);
        expect(mapped.payableAtProperty[0]).toBeInstanceOf(PropertyCharge);
    });

    it('is a list of charges on a quote', () => {
        const quote = TravelQuote.getInstance({id: 'q-1', payable_at_property: charges()});

        expect(quote.payableAtProperty.map(charge => charge.amount.currencyPrefixed)).toEqual(['USD 15.00', 'JPY 4,000']);
    });
});

describe('PayableAtProperty', () => {
    it('lists each charge on its own line, in its own currency', () => {
        const wrapper = mount(PayableAtProperty, {props: {charges: PropertyCharge.getCollection(charges())}});
        const lines = wrapper.findAll('li');

        expect(wrapper.text()).toContain("Payable at the hotel, in the hotel's currency");
        expect(lines).toHaveLength(2);
        expect(lines[0].text()).toContain('City tax');
        expect(lines[0].text()).toContain('USD 15.00');
        expect(lines[1].text()).toContain('Resort fee');
        expect(lines[1].text()).toContain('JPY 4,000');
    });

    it('never adds charges together, since they can be in two currencies', () => {
        const text = mount(PayableAtProperty, {props: {charges: PropertyCharge.getCollection(charges())}}).text();

        // Neither sum a careless total could produce: the raw minor units, or the
        // decimals read as one currency.
        expect(text).not.toMatch(/5,?500/);
        expect(text).not.toContain('4015');
    });

    it('shows no section at all when nothing is owed', () => {
        const wrapper = mount(PayableAtProperty, {props: {charges: []}});

        expect(wrapper.text()).toBe('');
        expect(wrapper.find('ul').exists()).toBe(false);
    });

    it('still shows a charge the supplier did not name', () => {
        const [unnamed] = PropertyCharge.getCollection([{...charges()[0], name: null}]);
        const wrapper = mount(PayableAtProperty, {props: {charges: [unnamed]}});

        expect(wrapper.find('li').text()).toContain('Charge at the hotel');
        expect(wrapper.find('li').text()).toContain('USD 15.00');
    });
});

describe('the screens that show it', () => {
    it('lists the charges under a room, never as undefined', () => {
        const wrapper = mount(HotelRooms, {props: {rates: [rate()], selected: null}});

        expect(wrapper.text()).toContain('USD 15.00');
        expect(wrapper.text()).toContain('JPY 4,000');
        expect(wrapper.text()).not.toContain('undefined');
    });

    it('lists the charges on the price card', () => {
        const wrapper = mount(HotelPrice, {props: {rate: rate(), money: {currency: 'AUD', decimalPlaces: 2}}});

        expect(wrapper.text()).toContain('USD 15.00');
        expect(wrapper.text()).toContain('JPY 4,000');
    });

    it('shows nothing, and no "undefined", for a rate still in the old shape', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const wrapper = mount(HotelRooms, {props: {rates: [rate(legacy)], selected: null}});

        expect(wrapper.text()).not.toContain('undefined');
        expect(wrapper.text()).not.toContain('AUD 134.00');
        expect(wrapper.text()).not.toContain('Payable at the hotel');
    });
});
