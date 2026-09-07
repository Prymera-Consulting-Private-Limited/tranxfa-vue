import { describe, it, expect, vi } from 'vitest'

import Hotel from '@/models/travel/hotels/hotel.js'
import HotelRate from '@/models/travel/hotels/hotel_rate.js'
import RateCancellation from '@/models/travel/hotels/rate_cancellation.js'
import HotelDetail from '@/models/travel/hotels/hotel_detail.js'
import HouseRuleCharge from '@/models/travel/hotels/house_rule_charge.js'
import HotelSearch from '@/models/travel/hotels/hotel_search.js'
import Region from '@/models/travel/region.js'

const ratePayload = (overrides = {}) => ({
    token: 'h-abc123',
    room_name: 'Junior Suite',
    meal: 'BREAKFAST',
    allotment: 4,
    bookable: true,
    breakdown: [
        { key: 'room', label: 'Room', amount: 22000, amount_formatted: '220.00', amount_currency_prefixed: 'USD 220.00' },
        { key: 'taxes_and_fees', label: 'Taxes and fees', amount: 0, amount_formatted: '0.00', amount_currency_prefixed: 'USD 0.00' },
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
        changes_at: '2026-09-08T12:00:00+00:00',
        costs_now: 0,
        costs_now_formatted: '0.00',
        costs_now_currency_prefixed: 'USD 0.00',
    },
    ...overrides,
})

describe('RateCancellation', () => {
    it('maps a resolved status with its dates and costs', () => {
        const cancellation = RateCancellation.getInstance(ratePayload().cancellation)

        expect(cancellation.status).toBe('free')
        expect(cancellation.freeUntil).toBe('2026-09-08T12:00:00+00:00')
        expect(cancellation.changesAt).toBe('2026-09-08T12:00:00+00:00')
        expect(cancellation.costsNow.amount).toBe(0)
        expect(cancellation.costsNow.currencyPrefixed).toBe('USD 0.00')
    })

    it('carries refund_now, which only the quote states', () => {
        const cancellation = RateCancellation.getInstance({
            status: 'partial',
            costs_now: 8000,
            costs_now_formatted: '80.00',
            costs_now_currency_prefixed: 'USD 80.00',
            refund_now: 15000,
            refund_now_formatted: '150.00',
            refund_now_currency_prefixed: 'USD 150.00',
        })

        expect(cancellation.refundNow.amount).toBe(15000)
        expect(cancellation.refundNow.currencyPrefixed).toBe('USD 150.00')
    })

    it('leaves refund_now unstated where it is not sent', () => {
        expect(RateCancellation.getInstance(ratePayload().cancellation).refundNow.isStated).toBe(false)
    })

    it('holds an unknown status with nothing costed, rather than guessing at zero', () => {
        const cancellation = RateCancellation.getInstance({
            status: 'unknown',
            free_until: null,
            changes_at: null,
            costs_now: null,
            costs_now_formatted: null,
            costs_now_currency_prefixed: null,
        })

        expect(cancellation.status).toBe('unknown')
        expect(cancellation.costsNow.isStated).toBe(false)
        expect(cancellation.freeUntil).toBeNull()
    })
})

describe('HotelRate.getInstance', () => {
    it('maps the rate with every amount as money', () => {
        const rate = HotelRate.getInstance(ratePayload())

        expect(rate.token).toBe('h-abc123')
        expect(rate.roomName).toBe('Junior Suite')
        expect(rate.meal).toBe('BREAKFAST')
        expect(rate.allotment).toBe(4)
        expect(rate.bookable).toBe(true)
        expect(rate.total.amount).toBe(23000)
        expect(rate.total.currencyPrefixed).toBe('USD 230.00')
        expect(rate.perNight.formatted).toBe('115.00')
        expect(rate.cancellation).toBeInstanceOf(RateCancellation)
    })

    it('keeps a zero breakdown line rather than dropping it', () => {
        const rate = HotelRate.getInstance(ratePayload())

        expect(rate.breakdown).toHaveLength(3)
        expect(rate.breakdown[1].key).toBe('taxes_and_fees')
        expect(rate.breakdown[1].amount.amount).toBe(0)
        expect(rate.breakdown[1].amount.isStated).toBe(true)
    })

    it('defaults a search rate to not bookable and no token', () => {
        const rate = HotelRate.getInstance(ratePayload({ token: undefined, bookable: undefined }))

        expect(rate.token).toBeNull()
        expect(rate.bookable).toBe(false)
    })

    it('leaves payable_at_property unstated when nothing is owed on arrival', () => {
        expect(HotelRate.getInstance(ratePayload()).payableAtProperty.isStated).toBe(false)
    })

    it('warns when the total disagrees with its breakdown', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

        HotelRate.getInstance(ratePayload({ total: 99999 }))

        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn.mock.calls[0][0]).toContain('99999')
        expect(warn.mock.calls[0][0]).toContain('23000')

        warn.mockRestore()
    })

    it('stays quiet when the total and the breakdown agree', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

        HotelRate.getInstance(ratePayload())

        expect(warn).not.toHaveBeenCalled()

        warn.mockRestore()
    })
})

describe('Hotel.getInstance', () => {
    const hotelPayload = (overrides = {}) => ({
        id: '9f2c-canonical',
        slug: 'the-mayfair-hotel',
        name: 'The Mayfair Hotel',
        address: '1256 West 7th Street',
        region: 'Los Angeles',
        star_rating: 4,
        photo: { thumbnail: 't', card: 'c', large: 'l' },
        amenities: ['airport-shuttle'],
        rate_count: 7,
        cheapest_rate: ratePayload(),
        ...overrides,
    })

    it('maps a search hotel and nests its one rate', () => {
        const hotel = Hotel.getInstance(hotelPayload())

        expect(hotel.id).toBe('9f2c-canonical')
        expect(hotel.slug).toBe('the-mayfair-hotel')
        expect(hotel.address).toBe('1256 West 7th Street')
        expect(hotel.starRating).toBe(4)
        expect(hotel.photo.card).toBe('c')
        expect(hotel.rateCount).toBe(7)
        expect(hotel.cheapestRate).toBeInstanceOf(HotelRate)
        expect(hotel.cheapestRate.total.amount).toBe(23000)
    })

    it('keeps an unrated hotel null rather than nought stars', () => {
        expect(Hotel.getInstance(hotelPayload({ star_rating: null })).starRating).toBeNull()
    })

    it('keeps a hotel with no photo null, which the facet counts on', () => {
        expect(Hotel.getInstance(hotelPayload({ photo: null })).photo).toBeNull()
    })

    it('maps a collection', () => {
        const hotels = Hotel.getCollection([hotelPayload(), hotelPayload({ id: 'other' })])

        expect(hotels).toHaveLength(2)
        expect(hotels[1].id).toBe('other')
    })
})

describe('HouseRuleCharge', () => {
    it('keeps the property currency apart from the amount', () => {
        const charge = HouseRuleCharge.getInstance({
            type: 'PARKING',
            inclusion: 'PAID',
            charge_unit: 'PER-VEHICLE-PER-NIGHT',
            currency: 'JPY',
            amount: 1850,
            amount_formatted: '1,850',
            amount_currency_prefixed: 'JPY 1,850',
        })

        expect(charge.type).toBe('PARKING')
        expect(charge.inclusion).toBe('PAID')
        expect(charge.chargeUnit).toBe('PER-VEHICLE-PER-NIGHT')
        expect(charge.currency).toBe('JPY')
        expect(charge.amount.currencyPrefixed).toBe('JPY 1,850')
    })

    it('holds a charge the hotel said nothing about without an amount', () => {
        const charge = HouseRuleCharge.getInstance({ type: 'COT', inclusion: 'UNSPECIFIED' })

        expect(charge.inclusion).toBe('UNSPECIFIED')
        expect(charge.amount.isStated).toBe(false)
        expect(charge.currency).toBeNull()
    })
})

describe('HotelDetail.getInstance', () => {
    const detailPayload = (overrides = {}) => ({
        id: 'hot-1',
        slug: 'the-mayfair-hotel',
        name: 'The Mayfair Hotel',
        address: 'Stratton Street',
        region: 'London',
        star_rating: 5,
        latitude: 51.5074,
        longitude: -0.1419,
        check_in_from: '14:00',
        check_out_until: '11:00',
        photos: [{ large: 'first' }, { large: 'second' }, { large: 'third' }],
        amenities: ['airport-shuttle'],
        house_rules: {
            text: [{ title: 'Meals', body: 'Breakfast is served until 10am.' }],
            charges: [{ type: 'PARKING', inclusion: 'PAID', currency: 'JPY', amount: 1850 }],
        },
        ...overrides,
    })

    it('maps the hotel and its stay times', () => {
        const hotel = HotelDetail.getInstance(detailPayload())

        expect(hotel.name).toBe('The Mayfair Hotel')
        expect(hotel.checkInFrom).toBe('14:00')
        expect(hotel.checkOutUntil).toBe('11:00')
        expect(hotel.amenities).toEqual(['airport-shuttle'])
    })

    it('splits house rules into prose and charges', () => {
        const hotel = HotelDetail.getInstance(detailPayload())

        expect(hotel.houseRules).toEqual([{ title: 'Meals', body: 'Breakfast is served until 10am.' }])
        expect(hotel.charges).toHaveLength(1)
        expect(hotel.charges[0]).toBeInstanceOf(HouseRuleCharge)
        expect(hotel.charges[0].currency).toBe('JPY')
    })

    it('leaves both empty when the hotel states no rules at all', () => {
        const hotel = HotelDetail.getInstance(detailPayload({ house_rules: null }))

        expect(hotel.houseRules).toEqual([])
        expect(hotel.charges).toEqual([])
    })

    it('preserves photo order, which is the hotel\'s own', () => {
        const hotel = HotelDetail.getInstance(detailPayload())

        expect(hotel.photos.map(photo => photo.large)).toEqual(['first', 'second', 'third'])
    })

    it('builds a map url only when it has both coordinates', () => {
        expect(HotelDetail.getInstance(detailPayload()).mapUrl).toContain('51.5074,-0.1419')
        expect(HotelDetail.getInstance(detailPayload({ latitude: null })).mapUrl).toBeNull()
        expect(HotelDetail.getInstance(detailPayload({ longitude: null })).mapUrl).toBeNull()
    })
})

describe('HotelSearch', () => {
    const searchPayload = {
        id: 'srch-1',
        expires_at: '2026-08-10T12:30:00+00:00',
        check_in: '2026-09-10',
        check_out: '2026-09-12',
        nights: 2,
        residency: 'GB',
        occupancy: { rooms: [{ adults: 2, children_ages: [7] }, { adults: 1, children_ages: [] }] },
    }

    it('maps the stay the backend resolved', () => {
        const search = HotelSearch.getInstance(searchPayload)

        expect(search.id).toBe('srch-1')
        expect(search.expiresAt).toBe('2026-08-10T12:30:00+00:00')
        expect(search.checkIn).toBe('2026-09-10')
        expect(search.checkOut).toBe('2026-09-12')
        expect(search.nights).toBe(2)
        expect(search.residency).toBe('GB')
    })

    it('exposes rooms in the shape the guest breakdown reads', () => {
        expect(HotelSearch.getInstance(searchPayload).rooms).toEqual([
            { adults: 2, children: [7] },
            { adults: 1, children: [] },
        ])
    })

    it('has no rooms when the search does not echo an occupancy', () => {
        expect(HotelSearch.getInstance({ id: 'srch-2' }).rooms).toEqual([])
    })
})

describe('Region', () => {
    it('maps a destination with its kind as a code', () => {
        const region = Region.getInstance({
            id: 'reg-1',
            slug: 'lagos',
            name: 'Lagos',
            kind: 'CITY',
            country: 'Nigeria',
            country_code: 'NG',
            about: 'Where most of our customers travel',
        })

        expect(region.id).toBe('reg-1')
        expect(region.name).toBe('Lagos')
        expect(region.kind).toBe('CITY')
        expect(region.country).toBe('Nigeria')
        expect(region.countryCode).toBe('NG')
        expect(region.about).toBe('Where most of our customers travel')
    })

    it('keeps an unrecognised kind null rather than inventing one', () => {
        expect(Region.getInstance({ id: 'reg-2', name: 'Somewhere' }).kind).toBeNull()
        expect(Region.getInstance({ id: 'reg-2', name: 'Somewhere' }).about).toBeNull()
    })

    it('maps a collection', () => {
        expect(Region.getCollection([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }])).toHaveLength(2)
    })
})
