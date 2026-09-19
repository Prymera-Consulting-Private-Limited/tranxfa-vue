// How delivering the room is going, as `fulfilment.state` says it (SD-1282).
// The order's own `state` cannot tell a paid booking still being placed from a
// paid booking the hotel could not provide: both are CREATED or CONFIRMED, paid,
// with no next step. This can.
//
// Only UNDELIVERED is branched on, and never from a label: `fulfilment.state_label`
// is operator wording ("Undelivered"), not for customers. The words a customer
// reads are the order's own `state_label` and `state_description`.
const OrderFulfilmentState = Object.freeze({
    // Nothing is being booked yet: the order is waiting to be paid, or the
    // payment has only just arrived.
    CREATED: 'CREATED',
    QUEUED: 'QUEUED',
    // We are waiting on the hotel.
    PROCESSING: 'PROCESSING',
    // The hotel confirmed the room.
    SUCCESS: 'SUCCESS',
    // The customer paid and the hotel could not provide the room. Our team
    // contacts them about the refund; there is nothing for the app to retry.
    UNDELIVERED: 'UNDELIVERED',
});

export default OrderFulfilmentState;
