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

        return booking;
    }
}

export default HotelBooking;
