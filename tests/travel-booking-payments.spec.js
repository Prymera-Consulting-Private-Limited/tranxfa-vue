import {afterEach, describe, expect, it, vi} from "vitest";
import {mount} from "@vue/test-utils";
import {fixture} from "./fixtures.js";
import OrderPayment from "@/models/travel/orders/order_payment.js";
import BookingPayments from "@/views/Travel/Bookings/Partials/BookingPayments.vue";

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), delete: vi.fn(), defaults: {}, interceptors: {request: {use: vi.fn()}, response: {use: vi.fn()}}}}));

// The booking page listed every payment attempt, so a booking that took three
// tries read as two failures and then the payment that counted. It shows one:
// the payment that paid for the booking, or failing that the latest attempt.
//
// The order views are the ones captured from Payvel staging on 19 September
// 2026 - see tests/fixtures/README.md.

afterEach(() => {
    vi.clearAllMocks();
});

const ORDER = '01a0a76b-3e9f-72db-98b0-89f04386670b';

const paymentsOf = name => OrderPayment.getCollection(fixture(name).payments);

function render(payments) {
    return mount(BookingPayments, {props: {orderId: ORDER, payments}});
}

const rows = wrapper => wrapper.findAll('li');

// A row is told apart by its badge, which is in our words (SD-2080).
const stateOf = row => row.find('span').text();

describe('the payment on a booking', () => {
    // Two attempts failed, then the one still waiting: the waiting one is the
    // only one the customer can do anything about.
    it('shows the latest attempt, and no earlier one', () => {
        const wrapper = render(paymentsOf('travel-order-view-deposit-pending'));

        expect(fixture('travel-order-view-deposit-pending').payments).toHaveLength(3);
        expect(rows(wrapper)).toHaveLength(1);
        expect(stateOf(rows(wrapper)[0])).toBe('Waiting for payment');
        expect(wrapper.text()).not.toContain('This attempt didn\'t go through');
    });

    it('still lets the customer cancel the waiting payment', () => {
        const wrapper = render(paymentsOf('travel-order-view-deposit-pending'));

        expect(wrapper.text()).toContain('Cancel this payment');
    });

    it('shows the payment that paid for the booking', () => {
        const wrapper = render(paymentsOf('travel-order-view-complete'));

        expect(rows(wrapper)).toHaveLength(1);
        expect(stateOf(rows(wrapper)[0])).toBe('Paid');
        expect(wrapper.text()).toContain('AUD 827.29');
        expect(wrapper.text()).not.toContain('Cancel this payment');
    });

    // Nothing succeeded, so the latest attempt is the whole story: here, the
    // payment the customer let go of after two that failed.
    it('shows only the latest of attempts that all fell through', () => {
        const wrapper = render(paymentsOf('travel-order-view-price-locked'));

        expect(fixture('travel-order-view-price-locked').payments).toHaveLength(3);
        expect(rows(wrapper)).toHaveLength(1);
        expect(stateOf(rows(wrapper)[0])).toBe('Cancelled');
    });

    // What paid for the booking outranks a later attempt, so a stray failure
    // after the money arrived never hides it.
    it('prefers a successful payment to a later one that failed', () => {
        const failed = paymentsOf('travel-order-view-price-locked')[0];
        const captured = paymentsOf('travel-order-view-complete')[0];
        const later = OrderPayment.getInstance({...fixture('travel-order-view-price-locked').payments[0], id: 'later', reference: 'later', state: 'FAILED', state_label: 'Failed'});
        const wrapper = render([failed, captured, later]);

        expect(rows(wrapper)).toHaveLength(1);
        expect(stateOf(rows(wrapper)[0])).toBe('Paid');
    });

    // Money that has gone back was money that arrived, so it is still the
    // payment for the booking.
    it.each([
        ['REFUNDED', 'Refunded', 'Refunded'],
        ['PART-REFUNDED', 'Part Refunded', 'Partly refunded'],
    ])('counts a %s payment as the one that paid', (state, consoleLabel, badge) => {
        const failed = OrderPayment.getInstance({...fixture('travel-order-view-price-locked').payments[0], state: 'FAILED', state_label: 'Failed'});
        const refunded = OrderPayment.getInstance({...fixture('travel-order-view-complete').payments[0], state, state_label: consoleLabel});
        const wrapper = render([refunded, failed]);

        expect(rows(wrapper)).toHaveLength(1);
        expect(stateOf(rows(wrapper)[0])).toBe(badge);
    });

    it('shows nothing for a booking nobody has tried to pay', () => {
        expect(render([]).find('section').exists()).toBe(false);
    });

    it('is headed for one payment, not for a list', () => {
        const wrapper = render(paymentsOf('travel-order-view-complete'));

        expect(wrapper.find('h2').text()).toBe('Payment');
        expect(wrapper.text()).not.toContain('Every attempt');
    });
});

// SD-2080. The badge showed state_label, the console's operator name for the
// state, so a customer read "Captured" beside their own money. It is in our
// words now, keyed off the state, like the note under it.
describe('the payment\'s badge', () => {
    // The console's label is replaced with one no customer should ever see, so
    // every row proves the badge does not read it.
    const paymentIn = (state, label = `${state} (operator wording)`) => OrderPayment.getInstance({
        ...fixture('travel-order-view-complete').payments[0],
        state,
        state_label: label,
    });

    it.each([
        ['CREATED', 'Waiting for payment'],
        ['INITIALIZED', 'Waiting for payment'],
        ['PENDING', 'Waiting for payment'],
        ['REDIRECTED', 'Waiting for payment'],
        ['AUTHORIZED', 'Paid'],
        ['CAPTURED', 'Paid'],
        ['FAILED', 'Didn\'t go through'],
        ['TIMED-OUT', 'Expired'],
        ['CANCELLED', 'Cancelled'],
        ['REFUNDED', 'Refunded'],
        ['PART-REFUNDED', 'Partly refunded'],
    ])('reads a %s payment as "%s"', (state, badge) => {
        const wrapper = render([paymentIn(state)]);

        expect(stateOf(rows(wrapper)[0])).toBe(badge);
        expect(wrapper.text()).not.toContain('operator wording');
    });

    it('never says "Captured" to a customer', () => {
        const wrapper = render([paymentIn('CAPTURED', 'Captured')]);

        expect(stateOf(rows(wrapper)[0])).toBe('Paid');
        expect(wrapper.text()).not.toContain('Captured');
    });

    // A state the console adds later still says something.
    it('reads a state it does not know with the console\'s label, or the state itself', () => {
        expect(stateOf(rows(render([paymentIn('ON-HOLD', 'On hold')]))[0])).toBe('On hold');
        expect(stateOf(rows(render([paymentIn('ON-HOLD', null)]))[0])).toBe('ON-HOLD');
    });
});
