import { describe, it, expect } from 'vitest'

import Recipient from '@/models/recipient.js'
import RecipientAttribute from '@/models/recipient_attribute.js'
import RecipientAccountDetail from '@/models/recipient_account_detail.js'
import PayoutChannelAttribute from '@/models/payout_channel_attribute.js'
import PayoutChannel from '@/models/payout_channel.js'
import Relationship from '@/models/relationship.js'
import RecipientTransactionSummary from '@/models/recipient_transaction_summary.js'
import DeliveryOption from '@/models/delivery_option.js'
import Country from '@/models/country.js'
import RecipientDataType from '@/enums/recipient_data_type.js'

describe('RecipientAccountDetail', () => {
    it('maps account number and hydrates institution', () => {
        const detail = RecipientAccountDetail.getInstance({
            account_number: '1234567',
            institution: { id: 'i-1', code: 'mufg', title: 'MUFG' },
        })

        expect(detail.accountNumber).toBe('1234567')
        expect(detail.institution).toBeInstanceOf(DeliveryOption)
    })

    it('keeps institution null when absent', () => {
        expect(RecipientAccountDetail.getInstance({ account_number: '1' }).institution).toBeNull()
    })
})

describe('RecipientAttribute', () => {
    it('extends PayoutChannelAttribute and maps plain values directly', () => {
        const attribute = RecipientAttribute.getInstance({
            type: RecipientDataType.TEXT,
            attribute: 'nickname',
            label: 'Nickname',
            is_required: false,
            value: 'Hana',
        })

        expect(attribute).toBeInstanceOf(PayoutChannelAttribute)
        expect(attribute.value).toBe('Hana')
        expect(attribute.label).toBe('Nickname')
    })

    it.each([
        RecipientDataType.MOBILE_NUMBER,
        RecipientDataType.PHONE_NUMBER,
    ])('wraps %s values into { country, number }', (type) => {
        const attribute = RecipientAttribute.getInstance({
            type,
            attribute: 'contact',
            value: {
                country: { id: 'c-jp', iso2_alpha: 'JP', calling_code: '81' },
                number: '9012345678',
            },
        })

        expect(attribute.value.country).toBeInstanceOf(Country)
        expect(attribute.value.country.callingCode).toBe('81')
        expect(attribute.value.number).toBe('9012345678')
    })

    it('leaves phone-type value null when the API sends none', () => {
        const attribute = RecipientAttribute.getInstance({
            type: RecipientDataType.MOBILE_NUMBER,
            attribute: 'contact',
        })

        expect(attribute.value).toBeNull()
    })

    it('hydrates delivery_option values into DeliveryOption', () => {
        const attribute = RecipientAttribute.getInstance({
            type: RecipientDataType.DELIVERY_OPTION,
            attribute: 'institution',
            value: { id: 'o-1', code: 'mufg', title: 'MUFG' },
        })

        expect(attribute.value).toBeInstanceOf(DeliveryOption)
        expect(attribute.value.code).toBe('mufg')
    })

    it('hydrates select options into DeliveryOption instances', () => {
        const attribute = RecipientAttribute.getInstance({
            type: RecipientDataType.SELECT,
            attribute: 'branch',
            options: [{ id: 'o-1', code: 'a' }, { id: 'o-2', code: 'b' }],
            value: 'o-2',
        })

        expect(attribute.options).toHaveLength(2)
        expect(attribute.options[0]).toBeInstanceOf(DeliveryOption)
        expect(attribute.value).toBe('o-2')
    })
})

describe('Recipient', () => {
    const payload = () => ({
        id: 'r-1',
        recipient_type: 'individual',
        name: 'Hanako',
        second_name: 'Yuki',
        third_name: 'Sato',
        whole_name: 'Hanako Yuki Sato',
        relationship: { id: 'rel-1', code: 'sibling' },
        channel: { id: 'ch-1' },
        account_detail: { account_number: '1234567' },
        account_detail_hashmap: { account_number: '1234567' },
        transaction_summary: { first_transaction_at: '2025-01-01' },
        attributes: [{ type: 'text', attribute: 'nickname', value: 'Hana' }],
    })

    it('maps names and hydrates every nested model', () => {
        const recipient = Recipient.getInstance(payload())

        expect(recipient.id).toBe('r-1')
        expect(recipient.recipientType).toBe('individual')
        expect(recipient.name).toBe('Hanako')
        expect(recipient.secondName).toBe('Yuki')
        expect(recipient.thirdName).toBe('Sato')
        expect(recipient.wholeName).toBe('Hanako Yuki Sato')
        expect(recipient.relationship).toBeInstanceOf(Relationship)
        expect(recipient.channel).toBeInstanceOf(PayoutChannel)
        expect(recipient.accountDetail).toBeInstanceOf(RecipientAccountDetail)
        expect(recipient.accountDetailHashMap).toEqual({ account_number: '1234567' })
        expect(recipient.transactionSummary).toBeInstanceOf(RecipientTransactionSummary)
        expect(recipient.attributes[0]).toBeInstanceOf(RecipientAttribute)
    })

    it('applies defaults when optional payloads are absent', () => {
        const recipient = Recipient.getInstance({ id: 'r-2' })

        expect(recipient.relationship).toBeNull()
        expect(recipient.channel).toBeNull()
        expect(recipient.accountDetail).toBeNull()
        expect(recipient.accountDetailHashMap).toEqual([])
        expect(recipient.transactionSummary).toBeNull()
        expect(recipient.attributes).toEqual([])
    })
})
