import { describe, it, expect } from 'vitest'

import TransactionState from '@/enums/transaction_state.js'
import TransactionStateIcon from '@/enums/transaction_state_icon.js'
import {
    ShieldCheckIcon,
    ClipboardDocumentListIcon,
    TrophyIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'

describe('TransactionStateIcon', () => {
    it('maps every transaction state to an icon component', () => {
        for (const state of Object.values(TransactionState)) {
            expect(TransactionStateIcon[state], `icon missing for state ${state}`).toBeTruthy()
        }
    })

    it('has no icon entries for unknown states', () => {
        const knownStates = new Set(Object.values(TransactionState))
        for (const state of Object.keys(TransactionStateIcon)) {
            expect(knownStates.has(state), `unexpected icon entry ${state}`).toBe(true)
        }
    })

    it('maps success and terminal states to their distinctive icons', () => {
        expect(TransactionStateIcon[TransactionState['PAYOUT-SUCCESS']]).toBe(TrophyIcon)
        expect(TransactionStateIcon[TransactionState.CANCELLED]).toBe(XMarkIcon)
        expect(TransactionStateIcon[TransactionState['ON-HOLD']]).toBe(ExclamationTriangleIcon)
    })

    // The source defines RISK-ASSESSMENT twice; the later ShieldCheckIcon entry
    // wins. This pins the effective behaviour so an accidental reorder is caught.
    it('resolves the duplicate RISK-ASSESSMENT entry to ShieldCheckIcon', () => {
        expect(TransactionStateIcon[TransactionState['RISK-ASSESSMENT']]).toBe(ShieldCheckIcon)
        expect(TransactionStateIcon[TransactionState['RISK-ASSESSMENT']]).not.toBe(ClipboardDocumentListIcon)
    })
})
