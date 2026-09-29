import { describe, it, expect } from 'vitest'

import Money from '@/models/travel/money.js'

describe('Money.getInstance', () => {
    it('reads four sibling keys off one field name', () => {
        const money = Money.getInstance({
            total: 23000,
            total_decimal: '230.00',
            total_formatted: '230.00',
            total_currency_prefixed: 'USD 230.00',
        }, 'total')

        expect(money.amount).toBe(23000)
        expect(money.decimal).toBe('230.00')
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

/**
 * The number handed to anybody who wants money rather than minor units — today
 * the Volume sdk. Everything here is about refusing rather than approximating,
 * because the failures this guards against are silent and are all mispricings.
 */
describe('Money.major', () => {
    const at = decimal => Money.getInstance({ amount: 19640, amount_decimal: decimal }, 'amount').major

    it('is the api’s own figure, exactly', () => {
        expect(at('196.40')).toBe(196.40)
        expect(at('0.01')).toBe(0.01)
        expect(at('1234567.89')).toBe(1234567.89)
    })

    it('needs no knowledge of the currency’s decimal places', () => {
        // A zero-decimal currency and a three-decimal one, off the same key
        expect(at('19640')).toBe(19640)
        expect(at('19.640')).toBe(19.640)
    })

    // parseFloat("1,234,567.89") is 1 — a bug that only shows above a thousand
    // and undercharges by six orders of magnitude when it does.
    it('refuses a separated figure rather than truncating it', () => {
        expect(at('1,234,567.89')).toBeNull()
        expect(at('1,234.56')).toBeNull()
    })

    it('refuses anything that is not a number, rather than reading it as zero', () => {
        expect(at('')).toBeNull()
        expect(at(null)).toBeNull()
        expect(at('GBP 196.40')).toBeNull()
        expect(at('one hundred')).toBeNull()
        expect(Money.getInstance({ amount: 19640 }, 'amount').major).toBeNull()
    })

    it('keeps a genuine zero, which is a real amount and not a missing one', () => {
        expect(at('0.00')).toBe(0)
    })
})
