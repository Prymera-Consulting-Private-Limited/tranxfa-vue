import Money from "@/models/travel/money.js";
import OrderCancellation from "@/models/travel/orders/order_cancellation.js";
import OrderConfirmation from "@/models/travel/orders/order_confirmation.js";
import OrderHotel from "@/models/travel/orders/order_hotel.js";
import OrderPayment from "@/models/travel/orders/order_payment.js";

/**
 * One hotel booking. The list and the single-booking endpoint return the same
 * object, the latter carrying the parts that cost real work per booking —
 * breakdown, payments, confirmation, guests, contact, and a cancellation block
 * that is present even when nobody has asked.
 */
class Order {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {string|null}
     */
    reference = null;

    /**
     * CREATED, CONFIRMED, FULFILLED, CANCELLED or FAILED. Whether the order was
     * placed — a different question from whether the hotel confirmed the room.
     *
     * @type {string|null}
     */
    state = null;

    /**
     * Where the booking stands for its customer, and unlike state it takes
     * payment into account: a FULFILLED booking nobody has paid for reads
     * "Price Locked", not "Order Complete" (SD-1230).
     *
     * @type {string|null}
     */
    stateLabel = null;

    /**
     * A sentence explaining stateLabel.
     *
     * @type {string|null}
     */
    stateDescription = null;

    /**
     * Whether a payment on this booking has succeeded. Null means a console too
     * old to say, where the screens keep the words they always had. The total
     * is what the booking costs, never evidence it was paid.
     *
     * @type {boolean|null}
     */
    isPaid = null;

    /**
     * What the booking is waiting on the customer to do, or null when nothing
     * is. The label is the console's words for the button.
     *
     * @type {{code: string, label: string|null}|null}
     */
    nextStep = null;

    /**
     * @type {string|null}
     */
    bookedAt = null;

    /**
     * @type {OrderHotel|null}
     */
    hotel = null;

    /**
     * @type {string|null}
     */
    checkIn = null;

    /**
     * @type {string|null}
     */
    checkOut = null;

    /**
     * @type {number|null}
     */
    nights = null;

    /**
     * @type {string|null}
     */
    roomName = null;

    /**
     * A code whose words belong to the labels dictionary, which these endpoints
     * do not send.
     *
     * @type {string|null}
     */
    meal = null;

    /**
     * @type {object|null}
     */
    occupancy = null;

    /**
     * The hotel answers our status check seconds to minutes after the booking
     * call has already returned, so this starts false on every booking and
     * confirmedAt starts null. Neither is a failure, and neither can be learnt
     * without asking again.
     *
     * @type {boolean}
     */
    isConfirmed = false;

    /**
     * @type {string|null}
     */
    confirmedAt = null;

    /**
     * @type {Money|null}
     */
    total = null;

    /**
     * @type {OrderCancellation|null}
     */
    cancellation = null;

    /**
     * @type {Array<{firstName: string, lastName: string}>}
     */
    guests = [];

    /**
     * @type {{email: string|null, phone: string|null}|null}
     */
    contact = null;

    /**
     * @type {OrderConfirmation|null}
     */
    confirmation = null;

    /**
     * @type {Array<{key: string, label: string, amount: Money}>}
     */
    breakdown = [];

    /**
     * @type {OrderPayment[]}
     */
    payments = [];

    /**
     * The payment still waiting on this order, as the bookings list names it
     * (SD-1261). There is at most one, and it is null when nothing is waiting.
     * Only the list sends it: a booking read on its own lists every attempt in
     * payments instead. It is how a customer told "another payment is holding
     * your account" finds which booking that payment belongs to.
     *
     * @type {OrderPayment|null}
     */
    openPayment = null;

    /**
     * The attempt currently worth watching — the last one made, since a customer
     * who was declined and paid again is waiting on the second, not the first.
     * The api sends them oldest first.
     *
     * @returns {OrderPayment|null}
     */
    get latestPayment() {
        return this.payments.length ? this.payments[this.payments.length - 1] : null;
    }

    /**
     * The payment the customer still has to finish, wherever this booking was
     * read from: the list names it, and a booking read on its own has it as
     * the last attempt. Paying again while it is open would be refused, so
     * whatever asks the customer to pay sends them here instead.
     *
     * @returns {OrderPayment|null}
     */
    get waitingPayment() {
        if (this.openPayment) {
            return this.openPayment;
        }

        return this.latestPayment?.isOpen ? this.latestPayment : null;
    }

    /**
     * The hotel has confirmed the room and nothing has been paid for it. The
     * state alone says FULFILLED, which reads as done; it is not.
     *
     * @returns {boolean}
     */
    get isPriceLocked() {
        return this.state === 'FULFILLED' && this.isPaid === false;
    }

    /**
     * Nothing more will happen to these on their own, so there is no point
     * asking again.
     *
     * @returns {boolean}
     */
    get isSettled() {
        return this.state === 'CANCELLED' || this.state === 'FAILED' || this.state === 'FULFILLED';
    }

    /**
     * The room is placed but the hotel has not answered yet, which is the
     * ordinary state of a booking for its first minutes.
     *
     * @returns {boolean}
     */
    get isAwaitingHotel() {
        return !this.isConfirmed && !this.isSettled;
    }

    /**
     * @returns {boolean}
     */
    get isCancelled() {
        return this.state === 'CANCELLED' || (this.cancellation?.isCancelled ?? false);
    }

    static getInstance(data) {
        const order = new Order();

        order.id = data.id;
        order.reference = data.reference ?? null;
        order.state = data.state ?? null;
        order.stateLabel = data.state_label ?? null;
        order.stateDescription = data.state_description ?? null;
        order.isPaid = typeof data.is_paid === 'boolean' ? data.is_paid : null;
        order.nextStep = data.next_step?.code
            ? {code: data.next_step.code, label: data.next_step.label ?? null}
            : null;
        order.bookedAt = data.booked_at ?? null;

        if (data.hotel) {
            order.hotel = OrderHotel.getInstance(data.hotel);
        }

        order.checkIn = data.check_in ?? null;
        order.checkOut = data.check_out ?? null;
        order.nights = data.nights ?? null;
        order.roomName = data.room_name ?? null;
        order.meal = data.meal ?? null;
        order.occupancy = data.occupancy ?? null;
        order.isConfirmed = data.is_confirmed ?? false;
        order.confirmedAt = data.confirmed_at ?? null;
        order.total = Money.getInstance(data, 'total');

        if (data.cancellation) {
            order.cancellation = OrderCancellation.getInstance(data.cancellation);
        }

        order.guests = Order.getGuests(data.guests);

        order.contact = data.contact
            ? {email: data.contact.email ?? null, phone: data.contact.phone ?? null}
            : null;

        if (data.confirmation) {
            order.confirmation = OrderConfirmation.getInstance(data.confirmation);
        }

        order.breakdown = (data.breakdown ?? []).map(line => ({
            key: line.key,
            label: line.label,
            amount: Money.getInstance(line, 'amount'),
        }));

        order.payments = OrderPayment.getCollection(data.payments ?? []);
        order.openPayment = data.open_payment ? OrderPayment.getInstance(data.open_payment) : null;

        return order;
    }

    /**
     * Guests arrive grouped into the rooms they were booked into — the same
     * shape the booking request sends, which is the sensible answer to the same
     * question. The response-shapes document described a flat array instead, so
     * both are read: the flat form has been documented and the grouped one is
     * what an order actually returns.
     *
     * They are flattened here because a booking shows who is staying, not who is
     * in which room. The room a name sits in is still on the wire if that ever
     * becomes worth showing.
     *
     * @param {{rooms: Array<{guests: Array}>}|Array|null} data
     * @returns {Array<{firstName: string|null, lastName: string|null, isChild: boolean}>}
     */
    static getGuests(data) {
        if (!data) {
            return [];
        }

        const guests = Array.isArray(data)
            ? data
            : (data.rooms ?? []).flatMap(room => room.guests ?? []);

        return guests.map(guest => ({
            firstName: guest.first_name ?? null,
            lastName: guest.last_name ?? null,
            isChild: guest.is_child ?? false,
        }));
    }

    /**
     * @param {Array} data
     * @returns {Order[]}
     */
    static getCollection(data) {
        return data.map(item => Order.getInstance(item));
    }
}

export default Order;
