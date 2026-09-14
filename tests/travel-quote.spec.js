import { describe, it, expect } from 'vitest'

import TravelQuote from '@/models/travel/quote.js'
import OrderHotel from '@/models/travel/orders/order_hotel.js'
import RateCancellation from '@/models/travel/hotels/rate_cancellation.js'

const quotePayload = (overrides = {}) => ({
    id: 'quote-1',
    reference: 'VQ-01K2ABCDEF',
    expires_at: '2026-08-10T12:15:00+00:00',
    currency: 'USD',
    currency_decimal_places: 2,
    nights: 2,
    check_in: '2026-09-10',
    check_out: '2026-09-12',
    residency: 'GB',
    occupancy: { rooms: [{ adults: 2, children_ages: [7] }] },
    hotel: { id: 'hot-1', slug: 'the-mayfair-hotel', name: 'The Mayfair Hotel', address: 'Stratton Street', star_rating: 5 },
    room: { room_name: 'Junior Suite', meal: 'BREAKFAST' },
    breakdown: [
        { key: 'room', label: 'Room', amount: 22000, amount_formatted: '220.00', amount_currency_prefixed: 'USD 220.00' },
        { key: 'convenience_fee', label: 'Convenience fee', amount: 1000, amount_formatted: '10.00', amount_currency_prefixed: 'USD 10.00' },
    ],
    total: 23000,
    total_formatted: '230.00',
    total_currency_prefixed: 'USD 230.00',
    per_night: 11500,
    per_night_formatted: '115.00',
    per_night_currency_prefixed: 'USD 115.00',
    payable_at_property: null,
    payable_at_property_formatted: null,
    payable_at_property_currency_prefixed: null,
    cancellation: {
        status: 'free',
        free_until: '2026-09-08T12:00:00+00:00',
        costs_now: 0,
        costs_now_formatted: '0.00',
        costs_now_currency_prefixed: 'USD 0.00',
        refund_now: 23000,
        refund_now_formatted: '230.00',
        refund_now_currency_prefixed: 'USD 230.00',
    },
    labels: { BREAKFAST: 'Breakfast included' },
    ...overrides,
})

describe('TravelQuote.getInstance', () => {
    it('maps the held price and what it is for', () => {
        const quote = TravelQuote.getInstance(quotePayload())

        expect(quote.id).toBe('quote-1')
        expect(quote.reference).toBe('VQ-01K2ABCDEF')
        expect(quote.expiresAt).toBe('2026-08-10T12:15:00+00:00')
        expect(quote.nights).toBe(2)
        expect(quote.checkIn).toBe('2026-09-10')
        expect(quote.residency).toBe('GB')
        expect(quote.hotel).toBeInstanceOf(OrderHotel)
        expect(quote.hotel.name).toBe('The Mayfair Hotel')
        expect(quote.room).toEqual({ roomName: 'Junior Suite', meal: 'BREAKFAST' })
    })

    it('maps every amount as money', () => {
        const quote = TravelQuote.getInstance(quotePayload())

        expect(quote.total.currencyPrefixed).toBe('USD 230.00')
        expect(quote.perNight.formatted).toBe('115.00')
        expect(quote.payableAtProperty.isStated).toBe(false)
        expect(quote.breakdown[0].amount.amount).toBe(22000)
        expect(quote.breakdown[1].label).toBe('Convenience fee')
    })

    it('has a breakdown that sums to the total, which the api guarantees', () => {
        const quote = TravelQuote.getInstance(quotePayload())
        const sum = quote.breakdown.reduce((total, line) => total + line.amount.amount, 0)

        expect(sum).toBe(quote.total.amount)
    })

    it('carries cancellation terms including what would come back', () => {
        const quote = TravelQuote.getInstance(quotePayload())

        expect(quote.cancellation).toBeInstanceOf(RateCancellation)
        expect(quote.cancellation.status).toBe('free')
        expect(quote.cancellation.costsNow.amount).toBe(0)
        expect(quote.cancellation.refundNow.currencyPrefixed).toBe('USD 230.00')
    })

    it('exposes the currency and its decimal places as one pair', () => {
        expect(TravelQuote.getInstance(quotePayload()).money).toEqual({ currency: 'USD', decimalPlaces: 2 })
    })

    it('defaults to two decimal places only when the api states none', () => {
        const quote = TravelQuote.getInstance(quotePayload({ currency: 'JPY', currency_decimal_places: 0 }))

        expect(quote.money).toEqual({ currency: 'JPY', decimalPlaces: 0 })
    })

    it('exposes rooms in the shape the guest breakdown reads', () => {
        expect(TravelQuote.getInstance(quotePayload()).rooms).toEqual([{ adults: 2, children: [7] }])
    })

    it('defaults labels to an empty dictionary', () => {
        expect(TravelQuote.getInstance(quotePayload({ labels: undefined })).labels).toEqual({})
    })
})
