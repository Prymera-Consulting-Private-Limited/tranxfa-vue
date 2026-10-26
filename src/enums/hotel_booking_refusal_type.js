// Why Book Quote answered 409 for a hotel (SD-1839). A 409 without a type is
// still a refusal shown as it stands: the room has gone, or the hotel's new
// price could not be held, and the customer chooses again.
const HotelBookingRefusalType = Object.freeze({
    // The hotel asked another price, higher or lower, and the new one is
    // already held as a quote of its own. See HotelPriceChange.
    HOTEL_PRICE_CHANGED: 'hotel_price_changed',
});

export default HotelBookingRefusalType;
