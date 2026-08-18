import { describe, it, expect } from 'vitest'

import Money from '@/models/travel/money.js'

describe('Money.getInstance', () => {
    it('reads three sibling keys off one field name', () => {
        const money = Money.getInstance({
            total: 23000,
            total_formatted: '230.00',
            total_currency_prefixed: 'USD 230.00',
        }, 'total')

        expect(money.amount).toBe(23000)
        expect(money.formatted).toBe('230.00')
        expect(money.currencyPrefixed).toBe('USD 230.00')
    })

    it('reads the field it is asked for and no other', () => {
        const payload = {
            total: 23000,
            total_formatted: '230.00',
            total_currency_prefixed: 'USD 230.00',
            per_night: 11500,
            per_night_formatted: '115.00',
            per_night_currency_prefixed: 'USD 115.00',
        }

        expect(Money.getInstance(payload, 'per_night').amount).toBe(11500)
        expect(Money.getInstance(payload, 'per_night').currencyPrefixed).toBe('USD 115.00')
    })

    it('keeps its shape when the amount is null, so "not stated" is one test', () => {
        const money = Money.getInstance({
            costs_now: null,
            costs_now_formatted: null,
            costs_now_currency_prefixed: null,
        }, 'costs_now')

        expect(money.amount).toBeNull()
        expect(money.formatted).toBeNull()
        expect(money.currencyPrefixed).toBeNull()
        expect(money.isStated).toBe(false)
    })

    it('treats an absent field the same as an explicit null', () => {
        const money = Money.getInstance({}, 'payable_at_property')

        expect(money.amount).toBeNull()
        expect(money.isStated).toBe(false)
    })

    it('counts zero as stated, since nothing to pay is an answer', () => {
        const money = Money.getInstance({
            costs_now: 0,
            costs_now_formatted: '0.00',
            costs_now_currency_prefixed: 'USD 0.00',
        }, 'costs_now')

        expect(money.amount).toBe(0)
        expect(money.isStated).toBe(true)
    })

    it('coerces a numeric string, so the amount can always be compared', () => {
        const money = Money.getInstance({ amount: '1850' }, 'amount')

        expect(money.amount).toBe(1850)
        expect(typeof money.amount).toBe('number')
    })
})
