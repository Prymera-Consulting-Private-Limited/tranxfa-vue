import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import GuestContactForm from '@/views/Travel/Hotels/Partials/GuestContactForm.vue'

/**
 * The booking body is built here and nowhere else, so a test that writes the
 * payload by hand and checks the api would accept it proves nothing about what
 * we send. These mount the form, fill it the way a customer would, and assert on
 * what it emits.
 */
const twoRooms = () => ([
    { adults: 2, children: [7] },
    { adults: 1, children: [] },
])

/**
 * @param {object} wrapper
 * @param {string[]} values In the order the inputs appear: names, then contact.
 */
async function fill(wrapper, values) {
    const inputs = wrapper.findAll('input')

    for (let index = 0; index < values.length; index += 1) {
        await inputs[index].setValue(values[index])
    }
}

const completeValues = [
    'Ada', 'Lovelace',
    'Grace', 'Hopper',
    'Byron', 'Lovelace',
    'Alan', 'Turing',
    'guest@example.com', '+441234567890',
]

describe('GuestContactForm', () => {
    it('asks for one name per person the stay was priced for', () => {
        const wrapper = mount(GuestContactForm, { props: { rooms: twoRooms() } })

        // Four people across two rooms, two name fields each, plus email and phone.
        expect(wrapper.findAll('input')).toHaveLength(10)
        expect(wrapper.text()).toContain('Adult 1')
        expect(wrapper.text()).toContain('Adult 2')
        expect(wrapper.text()).toContain('Child 1 (age 7)')
        expect(wrapper.text()).toContain('Room 1')
        expect(wrapper.text()).toContain('Room 2')
    })

    it('does not number the rooms when there is only one', () => {
        const wrapper = mount(GuestContactForm, { props: { rooms: [{ adults: 1, children: [] }] } })

        expect(wrapper.text()).not.toContain('Room 1')
    })

    it('emits guests grouped into the rooms they were priced into', async () => {
        const wrapper = mount(GuestContactForm, { props: { rooms: twoRooms() } })

        await fill(wrapper, completeValues)
        await wrapper.find('form').trigger('submit')

        expect(wrapper.emitted('submit')).toHaveLength(1)
        expect(wrapper.emitted('submit')[0][0]).toEqual({
            email: 'guest@example.com',
            phone: '+441234567890',
            rooms: [
                {
                    guests: [
                        { first_name: 'Ada', last_name: 'Lovelace', is_child: false },
                        { first_name: 'Grace', last_name: 'Hopper', is_child: false },
                        { first_name: 'Byron', last_name: 'Lovelace', is_child: true },
                    ],
                },
                {
                    guests: [
                        { first_name: 'Alan', last_name: 'Turing', is_child: false },
                    ],
                },
            ],
        })
    })

    it('marks a child from the slot rather than from anything typed', async () => {
        const wrapper = mount(GuestContactForm, { props: { rooms: [{ adults: 1, children: [4, 9] }] } })

        await fill(wrapper, ['A', 'One', 'B', 'Two', 'C', 'Three', 'a@b.com', '+441234567890'])
        await wrapper.find('form').trigger('submit')

        expect(wrapper.emitted('submit')[0][0].rooms[0].guests.map(guest => guest.is_child))
            .toEqual([false, true, true])
    })

    it('trims what it sends', async () => {
        const wrapper = mount(GuestContactForm, { props: { rooms: [{ adults: 1, children: [] }] } })

        await fill(wrapper, ['  Ada  ', '  Lovelace  ', '  guest@example.com  ', '  +441234567890  '])
        await wrapper.find('form').trigger('submit')

        const payload = wrapper.emitted('submit')[0][0]

        expect(payload.rooms[0].guests[0]).toEqual({ first_name: 'Ada', last_name: 'Lovelace', is_child: false })
        expect(payload.email).toBe('guest@example.com')
        expect(payload.phone).toBe('+441234567890')
    })

    it('will not submit until every name is given', async () => {
        const wrapper = mount(GuestContactForm, { props: { rooms: [{ adults: 2, children: [] }] } })

        await fill(wrapper, ['Ada', 'Lovelace', '', '', 'guest@example.com', '+441234567890'])
        await wrapper.find('form').trigger('submit')

        expect(wrapper.emitted('submit')).toBeUndefined()
        expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    })

    it('requires a contact number, since the supplier will not take a booking without one', async () => {
        const wrapper = mount(GuestContactForm, { props: { rooms: [{ adults: 1, children: [] }] } })

        await fill(wrapper, ['Ada', 'Lovelace', 'guest@example.com', ''])
        await wrapper.find('form').trigger('submit')

        expect(wrapper.emitted('submit')).toBeUndefined()
    })

    it('holds out for the supplier\'s five-character minimum', async () => {
        const wrapper = mount(GuestContactForm, { props: { rooms: [{ adults: 1, children: [] }] } })

        await fill(wrapper, ['Ada', 'Lovelace', 'guest@example.com', '+441'])
        await wrapper.find('form').trigger('submit')

        expect(wrapper.emitted('submit')).toBeUndefined()

        await wrapper.findAll('input')[3].setValue('+4412')
        await wrapper.find('form').trigger('submit')

        expect(wrapper.emitted('submit')).toHaveLength(1)
    })

    it('does not submit twice while a booking is in flight', async () => {
        const wrapper = mount(GuestContactForm, { props: { rooms: [{ adults: 1, children: [] }], isSubmitting: true } })

        await fill(wrapper, ['Ada', 'Lovelace', 'guest@example.com', '+441234567890'])
        await wrapper.find('form').trigger('submit')

        expect(wrapper.emitted('submit')).toBeUndefined()
    })

    /**
     * The quote hands its rooms over through a getter, so every re-render gives
     * this component a fresh array — and the page re-renders once a second to move
     * the countdown. Rebuilding on the array itself emptied the form under the
     * customer as they typed.
     */
    it('keeps what has been typed when the same occupancy arrives as a new array', async () => {
        const wrapper = mount(GuestContactForm, { props: { rooms: twoRooms() } })

        await fill(wrapper, completeValues)
        await wrapper.setProps({ rooms: twoRooms() })

        expect(wrapper.findAll('input')[0].element.value).toBe('Ada')
        expect(wrapper.findAll('input')[7].element.value).toBe('Turing')
    })

    it('starts over when the occupancy itself changes', async () => {
        const wrapper = mount(GuestContactForm, { props: { rooms: [{ adults: 1, children: [] }] } })

        await fill(wrapper, ['Ada', 'Lovelace', 'guest@example.com', '+441234567890'])
        await wrapper.setProps({ rooms: [{ adults: 2, children: [] }] })

        expect(wrapper.findAll('input')).toHaveLength(6)
        expect(wrapper.findAll('input')[0].element.value).toBe('')
    })

    it('puts a validation error on the guest it belongs to', () => {
        const wrapper = mount(GuestContactForm, {
            props: {
                rooms: twoRooms(),
                validationErrors: { 'rooms.1.guests.0.first_name': ['The first name field is required.'] },
            },
        })

        expect(wrapper.text()).toContain('The first name field is required.')
    })
})
