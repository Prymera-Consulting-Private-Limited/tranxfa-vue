import HotelQuote from "@/models/travel/hotels/hotel_quote.js";

/**
 * What the "book" call hands back once it has accepted a quote: a booking in
 * progress, not a finished reservation — status starts at "form_started" and
 * payment_types is what the still-to-come guest/payment step will need, not
 * something to charge from here.
 */
class HotelBooking {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {string|null}
     */
    status = null;

    /**
     * @type {boolean}
     */
    isGenderSpecificationRequired = false;

    /**
     * @type {{type: string, amount: string, currency: string, isNeedCreditCardData: boolean, isNeedCvc: boolean}[]}
     */
    paymentTypes = [];

    /**
     * The quote as it stood when booking started — same shape QuoteView
     * already renders, so re-showing the summary needs no new mapping.
     *
     * @type {HotelQuote|null}
     */
    quote = null;

    /**
     * One entry per room, each already holding a guest slot per adult/child
     * the search priced it for — created server-side so every guest has a
     * real id from the start, for the guest-details form to submit against.
     * firstName/lastName/gender are null until the guest-details form has
     * saved that slot.
     *
     * @type {{id: string, roomNumber: number, guests: {id: string, isChild: boolean, age: number|null, firstName: string|null, lastName: string|null, gender: string|null}[]}[]}
     */
    rooms = [];

    static getInstance(data) {
        const booking = new HotelBooking();

        booking.id = data.id;
        booking.status = data.status;
        booking.isGenderSpecificationRequired = data.is_gender_specification_required ?? false;
        booking.paymentTypes = (data.payment_types ?? []).map(paymentType => ({
            type: paymentType.type,
            amount: paymentType.amount,
            currency: paymentType.currency,
            isNeedCreditCardData: paymentType.is_need_credit_card_data ?? false,
            isNeedCvc: paymentType.is_need_cvc ?? false,
        }));

        if (data.quote) {
            booking.quote = HotelQuote.getInstance(data.quote);
        }

        booking.rooms = (data.rooms ?? [])
            .map(room => ({
                id: room.id,
                roomNumber: room.room_number,
                guests: (room.guests ?? []).map(guest => ({
                    id: guest.id,
                    isChild: guest.is_child ?? false,
                    age: guest.age ?? null,
                    firstName: guest.first_name ?? null,
                    lastName: guest.last_name ?? null,
                    gender: guest.gender ?? null,
                })),
            }))
            .sort((a, b) => a.roomNumber - b.roomNumber);

        return booking;
    }
}

export default HotelBooking;
