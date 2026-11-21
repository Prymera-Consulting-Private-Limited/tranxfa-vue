import {describe, expect, it} from "vitest";
import {mount} from "@vue/test-utils";
import {fixture} from "./fixtures.js";
import OrderCancellation from "@/models/travel/orders/order_cancellation.js";
import BookingCancellation from "@/views/Travel/Bookings/Partials/BookingCancellation.vue";

// SD-2080. Rehearsing the cancellation screencast the hotel supplier asked
// for, a cancelled booking's box was headed "Accepted by supplier", the
// console's operator name for the request's state, and its refund line read as
// if something had gone wrong. The box now says both in our own words.
//
// travel-order-view-cancelled is written by hand to the console's shape: see
// tests/fixtures/README.md.

const CANCELLED = 'travel-order-view-cancelled';

// The cancellation as the console sends it, with the request changed.
const cancellationWith = (requested) => {
    const data = fixture(CANCELLED).cancellation;

    return OrderCancellation.getInstance({...data, requested: {...data.requested, ...requested}});
};

const render = cancellation => mount(BookingCancellation, {props: {cancellation}});

// The box's first line, above the note in our words.
const headingOf = wrapper => wrapper.find('div.rounded-xl p').text();

// A refund the console says is owed: the fixture's booking was
// non-refundable, so it owes nothing.
const owed = {
    refund_owed: 18140,
    refund_owed_decimal: '181.40',
    refund_owed_formatted: '181.40',
    refund_owed_currency_prefixed: 'AUD 181.40',
};

describe('the cancellation box, in our own words', () => {
    // The console's labels are VasCancellationState::label(), written for
    // operators.
    it.each([
        ['REQUESTED', false, 'Requested', 'Cancellation requested'],
        ['ACCEPTED', true, 'Accepted by supplier', 'Cancellation accepted'],
        ['REFUSED', false, 'Refused by supplier', 'Cancellation refused'],
        ['UNRESOLVED', false, 'Needs attention', 'We\'re chasing the hotel'],
    ])('heads a %s request without the console\'s words', (state, isCancelled, consoleLabel, heading) => {
        const wrapper = render(cancellationWith({state, is_cancelled: isCancelled, state_label: consoleLabel}));

        expect(headingOf(wrapper)).toBe(heading);
        // No line of the box is the console's label. Our own date line says
        // "Requested" followed by the date, which is not it.
        expect(wrapper.findAll('p').map(line => line.text())).not.toContain(consoleLabel);
    });

    it('heads a cancelled booking "Cancellation accepted", never "Accepted by supplier"', () => {
        const wrapper = render(OrderCancellation.getInstance(fixture(CANCELLED).cancellation));

        expect(headingOf(wrapper)).toBe('Cancellation accepted');
        expect(wrapper.text()).not.toContain('Accepted by supplier');
    });

    // A state the console adds later still says something.
    it('heads a state it does not know with the console\'s label, or the state itself', () => {
        expect(headingOf(render(cancellationWith({state: 'WITHDRAWN', is_cancelled: false, state_label: 'Withdrawn'})))).toBe('Withdrawn');
        expect(headingOf(render(cancellationWith({state: 'WITHDRAWN', is_cancelled: false, state_label: null})))).toBe('WITHDRAWN');
    });
});

describe('the refund after a cancellation', () => {
    it('says a refund owed and not yet sent is being processed', () => {
        const wrapper = render(cancellationWith({...owed, refund_sent: false}));

        expect(wrapper.text()).toContain('Your refund is being processed.');
        expect(wrapper.text()).not.toContain('arranged by hand');
        expect(wrapper.text()).not.toContain('Your refund has been sent.');
    });

    it('says a refund that has left has been sent, as before', () => {
        const wrapper = render(cancellationWith({...owed, refund_sent: true}));

        expect(wrapper.text()).toContain('Your refund has been sent.');
        expect(wrapper.text()).not.toContain('being processed');
    });
});
