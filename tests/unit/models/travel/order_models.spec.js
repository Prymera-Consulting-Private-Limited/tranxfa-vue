import { describe, it, expect } from 'vitest'

import Order from '@/models/travel/orders/order.js'
import OrderHotel from '@/models/travel/orders/order_hotel.js'
import OrderPayment from '@/models/travel/orders/order_payment.js'
import OrderConfirmation from '@/models/travel/orders/order_confirmation.js'
import OrderCancellation from '@/models/travel/orders/order_cancellation.js'
import OrderCancellationQuote from '@/models/travel/orders/order_cancellation_quote.js'
import OrderCancellationRequest from '@/models/travel/orders/order_cancellation_request.js'

const requestPayload = (state, isCancelled, refundSent) => ({
    state,
    state_label: `${state} label`,
    is_cancelled: isCancelled,
    requested_at: '2026-08-18T10:02:00+00:00',
    refund_sent: refundSent,
    charged: 4860,
    charged_formatted: '48.60',
    charged_currency_prefixed: 'GBP 48.60',
    refund_owed: 18140,
    refund_owed_formatted: '181.40',
    refund_owed_currency_prefixed: 'GBP 181.40',
})

const orderPayload = (overrides = {}) => ({
    id: 'ord-1',
    reference: 'VO-01J8XAQ4V2NP7WZK3RB9CDEF0',
    state: 'CONFIRMED',
    state_label: 'Confirmed',
    state_description: 'Your booking has been placed and we are confirming it with the hotel.',
    booked_at: '2026-08-17T09:14:02+00:00',
    hotel: { id: 'hot-1', slug: 'the-mayfair-hotel', name: 'The Mayfair Hotel', address: 'Stratton Street, London', star_rating: 5 },
    check_in: '2026-09-10',
    check_out: '2026-09-12',
    nights: 2,
    room_name: 'Junior Suite',
    meal: 'BREAKFAST',
    occupancy: { rooms: [{ adults: 2, children_ages: [7] }] },
    is_confirmed: true,
    confirmed_at: '2026-08-17T09:14:48+00:00',
    total: 23000,
    total_formatted: '230.00',
    total_currency_prefixed: 'GBP 230.00',
    cancellation: null,
    ...overrides,
})

describe('OrderHotel', () => {
    it('maps the canonical hotel a booking links back to', () => {
        const hotel = OrderHotel.getInstance(orderPayload().hotel)

        expect(hotel.id).toBe('hot-1')
        expect(hotel.slug).toBe('the-mayfair-hotel')
        expect(hotel.address).toBe('Stratton Street, London')
        expect(hotel.starRating).toBe(5)
    })

    it('keeps an unrated hotel null', () => {
        expect(OrderHotel.getInstance({ id: 'h', name: 'H' }).starRating).toBeNull()
    })
})

describe('OrderCancellationQuote', () => {
    it('maps what cancelling would cost and give back', () => {
        const quote = OrderCancellationQuote.getInstance({
            is_free: false,
            is_inside_free_window: false,
            costs_now: 4860,
            costs_now_formatted: '48.60',
            costs_now_currency_prefixed: 'GBP 48.60',
            refund_now: 18140,
            refund_now_formatted: '181.40',
            refund_now_currency_prefixed: 'GBP 181.40',
        })

        expect(quote.isFree).toBe(false)
        expect(quote.isInsideFreeWindow).toBe(false)
        expect(quote.costsNow.currencyPrefixed).toBe('GBP 48.60')
        expect(quote.refundNow.amount).toBe(18140)
    })
})

describe('OrderCancellationRequest', () => {
    it('maps a request the hotel accepted', () => {
        const request = OrderCancellationRequest.getInstance(requestPayload('ACCEPTED', true, true))

        expect(request.state).toBe('ACCEPTED')
        expect(request.isCancelled).toBe(true)
        expect(request.refundSent).toBe(true)
        expect(request.charged.currencyPrefixed).toBe('GBP 48.60')
        expect(request.refundOwed.amount).toBe(18140)
    })

    it('keeps being owed money and having been sent it as separate facts', () => {
        const request = OrderCancellationRequest.getInstance(requestPayload('ACCEPTED', true, false))

        expect(request.refundOwed.amount).toBe(18140)
        expect(request.refundSent).toBe(false)
    })
})

describe('OrderCancellation', () => {
    it('is not cancelled while nobody has asked', () => {
        const cancellation = OrderCancellation.getInstance({ requested: null, can_cancel_now: true, quote: {
            is_free: true, is_inside_free_window: true, costs_now: 0, refund_now: 23000,
        } })

        expect(cancellation.request).toBeNull()
        expect(cancellation.canCancelNow).toBe(true)
        expect(cancellation.quote).toBeInstanceOf(OrderCancellationQuote)
        expect(cancellation.isCancelled).toBe(false)
        expect(cancellation.isPending).toBe(false)
    })

    it('has no quote when cancelling is not possible, which is never free', () => {
        const cancellation = OrderCancellation.getInstance({ requested: null, can_cancel_now: false, quote: null })

        expect(cancellation.canCancelNow).toBe(false)
        expect(cancellation.quote).toBeNull()
    })

    it('is cancelled only when the hotel accepted', () => {
        const accepted = OrderCancellation.getInstance({ requested: requestPayload('ACCEPTED', true, true), can_cancel_now: false, quote: null })

        expect(accepted.isCancelled).toBe(true)
        expect(accepted.isPending).toBe(false)
    })

    it('leaves a refused booking live, however much it looks cancelled', () => {
        const refused = OrderCancellation.getInstance({ requested: requestPayload('REFUSED', false, false), can_cancel_now: false, quote: null })

        expect(refused.request).not.toBeNull()
        expect(refused.isCancelled).toBe(false)
        expect(refused.isPending).toBe(true)
    })

    it('leaves an unresolved request live too, since nobody has answered', () => {
        const unresolved = OrderCancellation.getInstance({ requested: requestPayload('UNRESOLVED', false, false), can_cancel_now: false, quote: null })

        expect(unresolved.isCancelled).toBe(false)
        expect(unresolved.isPending).toBe(true)
    })
})

describe('OrderPayment', () => {
    it('maps an attempt with its state and amount', () => {
        const payment = OrderPayment.getInstance({
            reference: 'VO-…-P001',
            state: 'CAPTURED',
            state_label: 'Captured',
            method: 'Debit Card',
            attempted_at: '2026-08-17T09:15:10+00:00',
            amount: 23000,
            amount_formatted: '230.00',
            amount_currency_prefixed: 'GBP 230.00',
        })

        expect(payment.state).toBe('CAPTURED')
        expect(payment.stateLabel).toBe('Captured')
        expect(payment.method).toBe('Debit Card')
        expect(payment.amount.currencyPrefixed).toBe('GBP 230.00')
    })

    it('maps every attempt including the failed ones', () => {
        const payments = OrderPayment.getCollection([
            { reference: 'P1', state: 'FAILED', amount: 23000 },
            { reference: 'P2', state: 'CAPTURED', amount: 23000 },
        ])

        expect(payments).toHaveLength(2)
        expect(payments.map(payment => payment.state)).toEqual(['FAILED', 'CAPTURED'])
    })
})

describe('OrderConfirmation', () => {
    it('keeps its total a rendered string, being a record rather than a sum', () => {
        const confirmation = OrderConfirmation.getInstance({
            hotel: 'The Mayfair Hotel',
            room_name: 'Junior Suite',
            meal: 'BREAKFAST',
            check_in: '2026-09-10',
            check_out: '2026-09-12',
            nights: 2,
            total: 'GBP 230.00',
            price_lines: [{ anything: true }],
            cancellation_ladder: { anything: true },
            confirmed_at: '2026-08-17T09:14:48+00:00',
        })

        expect(confirmation.hotel).toBe('The Mayfair Hotel')
        expect(confirmation.total).toBe('GBP 230.00')
        expect(confirmation.confirmedAt).toBe('2026-08-17T09:14:48+00:00')
    })

    it('carries the stored structures through untouched', () => {
        const ladder = { policies: [{ start_at: null }] }
        const confirmation = OrderConfirmation.getInstance({ price_lines: [1, 2], cancellation_ladder: ladder })

        expect(confirmation.priceLines).toEqual([1, 2])
        expect(confirmation.cancellationLadder).toBe(ladder)
    })
})

describe('Order.getInstance', () => {
    it('maps a booking from the list', () => {
        const order = Order.getInstance(orderPayload())

        expect(order.id).toBe('ord-1')
        expect(order.reference).toBe('VO-01J8XAQ4V2NP7WZK3RB9CDEF0')
        expect(order.state).toBe('CONFIRMED')
        expect(order.stateLabel).toBe('Confirmed')
        expect(order.stateDescription).toContain('confirming it with the hotel')
        expect(order.hotel).toBeInstanceOf(OrderHotel)
        expect(order.nights).toBe(2)
        expect(order.total.currencyPrefixed).toBe('GBP 230.00')
        expect(order.cancellation).toBeNull()
    })

    it('maps the parts only the single booking carries', () => {
        const order = Order.getInstance(orderPayload({
            guests: [{ first_name: 'Ada', last_name: 'Lovelace' }, { first_name: 'Grace', last_name: 'Hopper' }],
            contact: { email: 'guest@example.com', phone: '+441234567890' },
            confirmation: { hotel: 'The Mayfair Hotel', total: 'GBP 230.00' },
            breakdown: [{ key: 'room', label: 'Room', amount: 20000, amount_formatted: '200.00', amount_currency_prefixed: 'GBP 200.00' }],
            payments: [{ reference: 'P1', state: 'CAPTURED', amount: 23000 }],
        }))

        expect(order.guests).toEqual([
            { firstName: 'Ada', lastName: 'Lovelace' },
            { firstName: 'Grace', lastName: 'Hopper' },
        ])
        expect(order.contact).toEqual({ email: 'guest@example.com', phone: '+441234567890' })
        expect(order.confirmation).toBeInstanceOf(OrderConfirmation)
        expect(order.breakdown[0].amount.currencyPrefixed).toBe('GBP 200.00')
        expect(order.payments[0]).toBeInstanceOf(OrderPayment)
    })

    it('leaves the single-booking parts empty on a list row', () => {
        const order = Order.getInstance(orderPayload())

        expect(order.guests).toEqual([])
        expect(order.contact).toBeNull()
        expect(order.confirmation).toBeNull()
        expect(order.breakdown).toEqual([])
        expect(order.payments).toEqual([])
    })

    it('is awaiting the hotel while placed but unconfirmed', () => {
        const order = Order.getInstance(orderPayload({ is_confirmed: false, confirmed_at: null }))

        expect(order.isConfirmed).toBe(false)
        expect(order.confirmedAt).toBeNull()
        expect(order.isAwaitingHotel).toBe(true)
        expect(order.isSettled).toBe(false)
    })

    it('stops awaiting once nothing more will happen, confirmed or not', () => {
        const states = ['CANCELLED', 'FAILED', 'FULFILLED']

        states.forEach((state) => {
            const order = Order.getInstance(orderPayload({ state, is_confirmed: false, confirmed_at: null }))

            expect(order.isSettled).toBe(true)
            expect(order.isAwaitingHotel).toBe(false)
        })
    })

    it('is not awaiting the hotel once it has confirmed', () => {
        expect(Order.getInstance(orderPayload()).isAwaitingHotel).toBe(false)
    })

    it('reads as cancelled from the state alone, which the list has to do', () => {
        expect(Order.getInstance(orderPayload({ state: 'CANCELLED' })).isCancelled).toBe(true)
    })

    it('reads as cancelled from an accepted request', () => {
        const order = Order.getInstance(orderPayload({
            cancellation: { requested: requestPayload('ACCEPTED', true, true), can_cancel_now: false, quote: null },
        }))

        expect(order.isCancelled).toBe(true)
    })

    it('does not read as cancelled when the hotel refused', () => {
        const order = Order.getInstance(orderPayload({
            cancellation: { requested: requestPayload('REFUSED', false, false), can_cancel_now: false, quote: null },
        }))

        expect(order.cancellation).toBeInstanceOf(OrderCancellation)
        expect(order.isCancelled).toBe(false)
    })

    it('maps a collection', () => {
        const orders = Order.getCollection([orderPayload(), orderPayload({ id: 'ord-2' })])

        expect(orders).toHaveLength(2)
        expect(orders[1].id).toBe('ord-2')
    })
})
