import { describe, it, expect } from 'vitest'

import PayoutChannel from '@/models/payout_channel.js'
import PayoutChannelAttribute from '@/models/payout_channel_attribute.js'
import PayoutChannelConfiguration from '@/models/payout_channel_configuration.js'
import PayoutMethod from '@/models/payout_method.js'
import PayoutTransaction from '@/models/payout_transaction.js'
import PayoutTransactionState from '@/models/payout_transaction_state.js'
import DeliveryOption from '@/models/delivery_option.js'
import Country from '@/models/country.js'
import Currency from '@/models/currency.js'

describe('PayoutChannelConfiguration', () => {
    it('maps all fields', () => {
        const configuration = PayoutChannelConfiguration.getInstance({
            recipient_type: 'individual',
            confirm_account_number: true,
            name_lookup_requirements: ['account_number'],
            name_validation_requirements: ['name'],
        })

        expect(configuration.recipientType).toBe('individual')
        expect(configuration.confirmAccountNumber).toBe(true)
        expect(configuration.nameLookupRequirements).toEqual(['account_number'])
        expect(configuration.nameValidationRequirements).toEqual(['name'])
    })

    it('applies safe defaults when fields are absent', () => {
        const configuration = PayoutChannelConfiguration.getInstance({})

        expect(configuration.recipientType).toBeNull()
        expect(configuration.confirmAccountNumber).toBe(false)
        expect(configuration.nameLookupRequirements).toEqual([])
        expect(configuration.nameValidationRequirements).toEqual([])
    })
})

describe('PayoutChannelAttribute', () => {
    const payload = () => ({
        type: 'select',
        input_mode: 'text',
        context: 'recipient',
        is_required: true,
        label: 'Bank',
        attribute: 'bank_code',
        prefix_addon: '+',
        suffix_addon: '@',
        help_text: 'Choose your bank',
        regex_pattern: '^\\d+$',
        regex_failure_message: 'Digits only',
        mask: '####',
        min_length: 2,
        max_length: 10,
        exact_length: null,
        min_value: '0',
        max_value: '99',
        exact_value: null,
        view_order: 3,
        options: [{ id: 'o-1', code: 'mufg', title: 'MUFG' }],
    })

    it('maps validation metadata and hydrates options', () => {
        const attribute = PayoutChannelAttribute.getInstance(payload())

        expect(attribute.type).toBe('select')
        expect(attribute.inputMode).toBe('text')
        expect(attribute.context).toBe('recipient')
        expect(attribute.isRequired).toBe(true)
        expect(attribute.label).toBe('Bank')
        expect(attribute.attribute).toBe('bank_code')
        expect(attribute.prefixAddon).toBe('+')
        expect(attribute.suffixAddon).toBe('@')
        expect(attribute.helpText).toBe('Choose your bank')
        expect(attribute.regexPattern).toBe('^\\d+$')
        expect(attribute.regexFailureMessage).toBe('Digits only')
        expect(attribute.mask).toBe('####')
        expect(attribute.minLength).toBe(2)
        expect(attribute.maxLength).toBe(10)
        expect(attribute.exactLength).toBeNull()
        expect(attribute.minValue).toBe('0')
        expect(attribute.maxValue).toBe('99')
        expect(attribute.exactValue).toBeNull()
        expect(attribute.viewOrder).toBe(3)
        expect(attribute.options[0]).toBeInstanceOf(DeliveryOption)
    })

    it('defaults options to empty when absent or empty', () => {
        const data = payload()
        delete data.options
        expect(PayoutChannelAttribute.getInstance(data).options).toEqual([])
        expect(PayoutChannelAttribute.getInstance({ ...payload(), options: [] }).options).toEqual([])
    })
})

describe('PayoutChannel', () => {
    it('hydrates configuration, country, currency, method and attributes', () => {
        const channel = PayoutChannel.getInstance({
            id: 'ch-1',
            configuration: { recipient_type: 'individual' },
            country: { id: 'c-us', iso2_alpha: 'US' },
            currency: { id: 'cur-usd', code: 'USD' },
            payout_method: { id: 'pm-1', code: 'bank' },
            attributes: [{ type: 'text', attribute: 'account_number' }],
        })

        expect(channel.id).toBe('ch-1')
        expect(channel.configuration).toBeInstanceOf(PayoutChannelConfiguration)
        expect(channel.country).toBeInstanceOf(Country)
        expect(channel.currency).toBeInstanceOf(Currency)
        expect(channel.payoutMethod).toBeInstanceOf(PayoutMethod)
        expect(channel.attributes[0]).toBeInstanceOf(PayoutChannelAttribute)
    })

    it('applies defaults when nested payloads are absent', () => {
        const channel = PayoutChannel.getInstance({ id: 'ch-2' })

        expect(channel.configuration).toBeNull()
        expect(channel.country).toBeNull()
        expect(channel.currency).toBeNull()
        expect(channel.payoutMethod).toBeNull()
        expect(channel.attributes).toEqual([])
    })
})

describe('PayoutMethod', () => {
    it('maps fields including instruction → instructions and nested channel', () => {
        const method = PayoutMethod.getInstance({
            id: 'pm-1',
            code: 'bank',
            title: 'Bank transfer',
            description: 'Direct to bank',
            instruction: 'Provide account details',
            promo: 'No fees',
            icon_uri: 'https://cdn.example/bank.svg',
            channel: { id: 'ch-1' },
        })

        expect(method.id).toBe('pm-1')
        expect(method.code).toBe('bank')
        expect(method.title).toBe('Bank transfer')
        expect(method.description).toBe('Direct to bank')
        expect(method.instructions).toBe('Provide account details')
        expect(method.promo).toBe('No fees')
        expect(method.iconUri).toBe('https://cdn.example/bank.svg')
        expect(method.channel).toBeInstanceOf(PayoutChannel)
    })

    it('keeps channel null when absent', () => {
        expect(PayoutMethod.getInstance({ id: 'pm-2' }).channel).toBeNull()
    })
})

describe('PayoutTransaction', () => {
    it('maps collection pin fields and hydrates state', () => {
        const payout = PayoutTransaction.getInstance({
            id: 'po-1',
            shared_reference: 'REF-9',
            collection_pin: '1234',
            collection_pin_available: true,
            state: { id: 's-1', code: 'SENT', color_scheme: 'blue' },
        })

        expect(payout.id).toBe('po-1')
        expect(payout.sharedReference).toBe('REF-9')
        expect(payout.collectionPin).toBe('1234')
        expect(payout.collectionPinAvailable).toBe(true)
        expect(payout.state).toBeInstanceOf(PayoutTransactionState)
    })

    it('defaults collectionPinAvailable to false and state to null', () => {
        const payout = PayoutTransaction.getInstance({ id: 'po-2' })

        expect(payout.collectionPinAvailable).toBe(false)
        expect(payout.state).toBeNull()
    })
})
