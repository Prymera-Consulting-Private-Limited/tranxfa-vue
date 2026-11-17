import { describe, it, expect } from 'vitest'

import Account from '@/models/account.js'
import Company from '@/models/company.js'
import Country from '@/models/country.js'
import Currency from '@/models/currency.js'
import CustomerAddress from '@/models/customer_address.js'
import CustomerAttribute from '@/models/customer_attribute.js'
import { CustomerTask } from '@/models/customer_task.js'
import DeliveryOption from '@/models/delivery_option.js'
import Device from '@/models/device.js'
import Occupation from '@/models/occupation.js'
import Relationship from '@/models/relationship.js'
import SalaryRange from '@/models/salary_range.js'
import Session from '@/models/session.js'
import SubDeliveryOption from '@/models/sub_delivery_option.js'
import RecipientTransactionSummary from '@/models/recipient_transaction_summary.js'
import TransactionState from '@/models/transaction_state.js'
import PaymentTransactionState from '@/models/payment_transaction_state.js'
import PayoutTransactionState from '@/models/payout_transaction_state.js'

describe('Country', () => {
    it('maps a full API payload from snake_case', () => {
        const country = Country.getInstance({
            id: 'c-1',
            iso2_alpha: 'JP',
            iso3_alpha: 'JPN',
            iso_numeric: '392',
            fips_code: 'JA',
            slug: 'japan',
            calling_code: '81',
            common_name: 'Japan',
            official_name: 'Japan',
            endonym: '日本',
            demonym: 'Japanese',
        })

        expect(country.id).toBe('c-1')
        expect(country.iso2Alpha).toBe('JP')
        expect(country.iso3Alpha).toBe('JPN')
        expect(country.isoNumeric).toBe('392')
        expect(country.fipsCode).toBe('JA')
        expect(country.slug).toBe('japan')
        expect(country.callingCode).toBe('81')
        expect(country.commonName).toBe('Japan')
        expect(country.officialName).toBe('Japan')
        expect(country.endonym).toBe('日本')
        expect(country.demonym).toBe('Japanese')
    })

    it('leaves absent fields undefined without throwing', () => {
        const country = Country.getInstance({ id: 'c-2' })
        expect(country.id).toBe('c-2')
        expect(country.iso2Alpha).toBeUndefined()
        expect(country.commonName).toBeUndefined()
    })
})

describe('Currency', () => {
    it('maps a full API payload including type → currencyType', () => {
        const currency = Currency.getInstance({
            id: 'cur-1',
            decimal_places: 2,
            iso_numeric: '392',
            iso_alpha: 'JPY',
            type: 'fiat',
            common_name: 'Yen',
            official_name: 'Japanese Yen',
            crypto_code: null,
            code: 'JPY',
            icon_unicode: '¥',
        })

        expect(currency.id).toBe('cur-1')
        expect(currency.decimalPlaces).toBe(2)
        expect(currency.isoAlpha).toBe('JPY')
        expect(currency.currencyType).toBe('fiat')
        expect(currency.commonName).toBe('Yen')
        expect(currency.officialName).toBe('Japanese Yen')
        expect(currency.cryptoCode).toBeNull()
        expect(currency.code).toBe('JPY')
        expect(currency.iconUnicode).toBe('¥')
    })
})

describe('Account', () => {
    it('maps flat fields and hydrates the mobile number country', () => {
        const account = Account.getInstance({
            email: 'user@example.com',
            is_email_verified: true,
            password_changed_at: '2026-01-01',
            mobile_number: '9012345678',
            mobile_number_country: { id: 'c-1', iso2_alpha: 'JP' },
            created_at: '2025-01-01',
            updated_at: '2025-06-01',
        })

        expect(account.email).toBe('user@example.com')
        expect(account.isEmailVerified).toBe(true)
        expect(account.passwordChangedAt).toBe('2026-01-01')
        expect(account.mobileNumber).toBe('9012345678')
        expect(account.mobileNumberCountry).toBeInstanceOf(Country)
        expect(account.mobileNumberCountry.iso2Alpha).toBe('JP')
        expect(account.createdAt).toBe('2025-01-01')
        expect(account.updatedAt).toBe('2025-06-01')
    })

    it('keeps mobileNumberCountry null when country absent', () => {
        const account = Account.getInstance({ email: 'a@b.c' })
        expect(account.mobileNumberCountry).toBeNull()
    })
})

describe('CustomerAddress', () => {
    it('maps address lines and locality fields', () => {
        const address = CustomerAddress.getInstance({
            address_line_1: '1-2-3 Shibuya',
            address_line_2: 'Apt 4',
            city: 'Tokyo',
            postcode: '150-0002',
            region: 'Kanto',
            created_at: '2025-01-01',
            updated_at: '2025-02-01',
        })

        expect(address.addressLine1).toBe('1-2-3 Shibuya')
        expect(address.addressLine2).toBe('Apt 4')
        expect(address.city).toBe('Tokyo')
        expect(address.postcode).toBe('150-0002')
        expect(address.region).toBe('Kanto')
        expect(address.createdAt).toBe('2025-01-01')
        expect(address.updatedAt).toBe('2025-02-01')
    })
})

describe('CustomerAttribute', () => {
    it('maps validation metadata and value', () => {
        const attribute = CustomerAttribute.getInstance({
            attribute: 'first_name',
            category: 'identity',
            regular_expression: '^[a-z]+$',
            mask: 'A*',
            expression_error_message: 'Letters only',
            label: 'First name',
            info_text: 'As per passport',
            is_required: true,
            value: 'taro',
        })

        expect(attribute.attribute).toBe('first_name')
        expect(attribute.category).toBe('identity')
        expect(attribute.regularExpression).toBe('^[a-z]+$')
        expect(attribute.mask).toBe('A*')
        expect(attribute.expressionErrorMessage).toBe('Letters only')
        expect(attribute.label).toBe('First name')
        expect(attribute.infoText).toBe('As per passport')
        expect(attribute.isRequired).toBe(true)
        expect(attribute.value).toBe('taro')
    })
})

describe('CustomerTask model', () => {
    it('maps id, title, description and status', () => {
        const task = CustomerTask.getInstance({
            id: 't-1',
            title: 'Verify email',
            description: 'Confirm your email address',
            status: 'pending',
        })

        expect(task.id).toBe('t-1')
        expect(task.title).toBe('Verify email')
        expect(task.description).toBe('Confirm your email address')
        expect(task.status).toBe('pending')
    })
})

describe('Device', () => {
    it('maps device, client and OS metadata', () => {
        const device = Device.getInstance({
            id: 'd-1',
            device_type: 'desktop',
            client_code: 'chrome',
            client_name: 'Chrome',
            client_version: '126',
            os_code: 'win',
            os_name: 'Windows',
            os_version: '10',
            architecture: 'x64',
            vendor: 'Dell',
            model: 'XPS',
            touched_at: '2026-01-01',
            is_current: true,
        })

        expect(device.id).toBe('d-1')
        expect(device.deviceType).toBe('desktop')
        expect(device.clientCode).toBe('chrome')
        expect(device.clientName).toBe('Chrome')
        expect(device.clientVersion).toBe('126')
        expect(device.osCode).toBe('win')
        expect(device.osName).toBe('Windows')
        expect(device.osVersion).toBe('10')
        expect(device.architecture).toBe('x64')
        expect(device.vendor).toBe('Dell')
        expect(device.model).toBe('XPS')
        expect(device.touchedAt).toBe('2026-01-01')
        expect(device.isCurrent).toBe(true)
    })
})

describe('Session', () => {
    it('maps session and MFA fields', () => {
        const session = Session.getInstance({
            id: 's-1',
            is_mfa_completed: false,
            session_token: 'tok',
            mfa_method: 'otp',
            client_version: '1.0',
            os_version: '10',
            touched_at: '2026-01-01',
            created_at: '2025-01-01',
            updated_at: '2025-02-01',
        })

        expect(session.id).toBe('s-1')
        expect(session.isMfaCompleted).toBe(false)
        expect(session.sessionToken).toBe('tok')
        expect(session.mfaMethod).toBe('otp')
        expect(session.clientVersion).toBe('1.0')
        expect(session.osVersion).toBe('10')
        expect(session.touchedAt).toBe('2026-01-01')
        expect(session.createdAt).toBe('2025-01-01')
        expect(session.updatedAt).toBe('2025-02-01')
    })
})

describe.each([
    ['Company', Company],
    ['DeliveryOption', DeliveryOption],
    ['SubDeliveryOption', SubDeliveryOption],
])('%s', (name, Model) => {
    it('maps id, code and title', () => {
        const instance = Model.getInstance({ id: 'x-1', code: 'CODE', title: 'Title' })
        expect(instance.id).toBe('x-1')
        expect(instance.code).toBe('CODE')
        expect(instance.title).toBe('Title')
    })
})

describe.each([
    ['Occupation', Occupation],
    ['Relationship', Relationship],
])('%s', (name, Model) => {
    it('maps id, code, title and description', () => {
        const instance = Model.getInstance({
            id: 'x-1', code: 'CODE', title: 'Title', description: 'Desc',
        })
        expect(instance.id).toBe('x-1')
        expect(instance.code).toBe('CODE')
        expect(instance.title).toBe('Title')
        expect(instance.description).toBe('Desc')
    })
})

describe('SalaryRange', () => {
    it('maps id and title', () => {
        const range = SalaryRange.getInstance({ id: 'r-1', title: '0 - 100k' })
        expect(range.id).toBe('r-1')
        expect(range.title).toBe('0 - 100k')
    })
})

describe('RecipientTransactionSummary', () => {
    it('maps first and recent transaction dates', () => {
        const summary = RecipientTransactionSummary.getInstance({
            first_transaction_at: '2025-01-01',
            recent_transaction_at: '2026-01-01',
        })
        expect(summary.firstTransactionAt).toBe('2025-01-01')
        expect(summary.recentTransactionAt).toBe('2026-01-01')
    })
})

describe('TransactionState model', () => {
    it('maps display metadata including progress and color scheme', () => {
        const state = TransactionState.getInstance({
            id: 'st-1',
            code: 'PAYOUT-SUCCESS',
            label: 'Paid out',
            description: 'Money delivered',
            progress: '100',
            color_scheme: 'green',
        })

        expect(state.id).toBe('st-1')
        expect(state.code).toBe('PAYOUT-SUCCESS')
        expect(state.label).toBe('Paid out')
        expect(state.description).toBe('Money delivered')
        expect(state.progress).toBe('100')
        expect(state.colorScheme).toBe('green')
    })
})

describe.each([
    ['PaymentTransactionState', PaymentTransactionState],
    ['PayoutTransactionState', PayoutTransactionState],
])('%s', (name, Model) => {
    it('maps id, code and color scheme', () => {
        const state = Model.getInstance({ id: 's-1', code: 'CAPTURED', color_scheme: 'green' })
        expect(state.id).toBe('s-1')
        expect(state.code).toBe('CAPTURED')
        expect(state.colorScheme).toBe('green')
    })
})
