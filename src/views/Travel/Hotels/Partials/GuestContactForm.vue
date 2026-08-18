<script setup>
import {computed, reactive, ref, watch} from 'vue';
import Spinner from '@/components/Spinner.vue';
import {ExclamationTriangleIcon} from '@heroicons/vue/24/outline';

const props = defineProps({
  /**
   * The rooms the stay was priced for, so the form asks for exactly as many
   * names as there are people and no more.
   *
   * @type {Array<{adults: number, children: number[]}>}
   */
  rooms: {
    type: Array,
    default: () => [],
  },

  isSubmitting: {
    type: Boolean,
    default: false,
  },

  submitError: {
    type: String,
    default: null,
  },

  /**
   * Laravel's `errors` object off a 422, keyed on the field path the payload
   * used — "guests.0.first_name", "email", "phone".
   */
  validationErrors: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['submit']);

// One slot per person the room was priced for, kept grouped in the room they
// belong to — the booking is answering the same occupancy question the search
// was asked, so it wants the same shape back.
const roomSlots = computed(() => props.rooms.map((room, roomIndex) => {
    const guests = [];

    for (let adult = 0; adult < room.adults; adult += 1) {
        guests.push({label: `Adult ${adult + 1}`, isChild: false});
    }

    room.children.forEach((age, child) => {
        guests.push({label: `Child ${child + 1} (age ${age})`, isChild: true});
    });

    return {number: roomIndex + 1, guests: guests};
}));

const rooms = reactive([]);

/**
 * The occupancy as a string, so the slots are rebuilt when the stay actually
 * changes and not merely when the prop is a new array.
 *
 * This matters more than it looks: the quote exposes its rooms through a getter,
 * so every re-render hands this component a fresh array — and the page re-renders
 * once a second to move the countdown. Watching the array itself would empty the
 * form under the customer while they were typing into it.
 */
const occupancy = computed(() => props.rooms.map(room => `${room.adults}:${room.children.join(',')}`).join('|'));

watch(occupancy, () => {
    rooms.splice(0, rooms.length, ...roomSlots.value.map(room => ({
        number: room.number,
        guests: room.guests.map(guest => ({...guest, firstName: '', lastName: ''})),
    })));
}, {immediate: true});

const email = ref('');
const phone = ref('');

// Capped server-side; the inputs say so rather than letting somebody type past
// it and be told afterwards.
const NAME_MAX = 120;
const PHONE_MAX = 32;

/**
 * The supplier will not take a booking without a contact number, and only says
 * so at the last step — after the room has been set aside. So a number missing
 * here is not a field somebody can come back to, it is a held room nobody ever
 * completes. Five characters is their floor, not a claim about phone numbers:
 * what a real number looks like varies too much by country for us to decide.
 */
const PHONE_MIN = 5;

const isComplete = computed(() => {
    return rooms.every(room => room.guests.every(guest => guest.firstName.trim() && guest.lastName.trim()))
        && email.value.trim().length > 0
        && phone.value.trim().length >= PHONE_MIN;
});

const showRoomNumbers = computed(() => props.rooms.length > 1);

/**
 * The 422 paths follow the payload, so an error on one guest lands on that
 * guest's field rather than on the form.
 *
 * @param {string} path
 * @returns {string|null}
 */
function fieldError(path) {
    const messages = props.validationErrors?.[path];

    return Array.isArray(messages) ? messages[0] : (messages ?? null);
}

function submit() {
    if (!isComplete.value || props.isSubmitting) {
        return;
    }

    emit('submit', {
        email: email.value.trim(),
        phone: phone.value.trim(),
        rooms: rooms.map(room => ({
            guests: room.guests.map(guest => ({
                first_name: guest.firstName.trim(),
                last_name: guest.lastName.trim(),
                is_child: guest.isChild,
            })),
        })),
    });
}
</script>

<template>
  <form @submit.prevent="submit" class="overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200">
    <header class="border-b border-gray-100 px-5 py-4">
      <h2 class="text-sm font-semibold text-gray-900">Who is staying</h2>
      <!-- Nothing beyond a name is asked for, and nothing beyond a name should be. -->
      <p class="mt-0.5 text-xs text-gray-500">Names as they appear on the ID each guest will bring to the hotel.</p>
    </header>
    <div class="space-y-5 px-5 py-5">
      <div v-for="(room, roomIndex) in rooms" :key="roomIndex" class="space-y-4">
        <p v-if="showRoomNumbers" class="text-sm font-semibold text-gray-900">Room {{ room.number }}</p>
        <div v-for="(guest, guestIndex) in room.guests" :key="guestIndex">
          <p class="text-xs font-medium tracking-wide text-gray-400 uppercase">{{ guest.label }}</p>
          <div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <input
                  v-model="guest.firstName"
                  type="text"
                  autocomplete="off"
                  :maxlength="NAME_MAX"
                  placeholder="First name"
                  :class="[
                    fieldError(`rooms.${roomIndex}.guests.${guestIndex}.first_name`) ? 'ring-red-300' : 'ring-gray-200',
                    'w-full rounded-xl px-3.5 py-2.5 text-sm text-gray-900 ring-1 transition placeholder:text-gray-400 focus:ring-brand-400 focus:outline-0',
                  ]"
              />
              <p v-if="fieldError(`rooms.${roomIndex}.guests.${guestIndex}.first_name`)" class="mt-1 text-xs text-red-600">{{ fieldError(`rooms.${roomIndex}.guests.${guestIndex}.first_name`) }}</p>
            </div>
            <div>
              <input
                  v-model="guest.lastName"
                  type="text"
                  autocomplete="off"
                  :maxlength="NAME_MAX"
                  placeholder="Last name"
                  :class="[
                    fieldError(`rooms.${roomIndex}.guests.${guestIndex}.last_name`) ? 'ring-red-300' : 'ring-gray-200',
                    'w-full rounded-xl px-3.5 py-2.5 text-sm text-gray-900 ring-1 transition placeholder:text-gray-400 focus:ring-brand-400 focus:outline-0',
                  ]"
              />
              <p v-if="fieldError(`rooms.${roomIndex}.guests.${guestIndex}.last_name`)" class="mt-1 text-xs text-red-600">{{ fieldError(`rooms.${roomIndex}.guests.${guestIndex}.last_name`) }}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="border-t border-gray-100 pt-5">
        <p class="text-xs font-medium tracking-wide text-gray-400 uppercase">Where to reach you</p>
        <p class="mt-1 text-xs text-gray-500">We'll send the confirmation to your email. The hotel needs a phone number for the booking, and will only use it if they have to reach you.</p>
        <div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <input
                v-model="email"
                type="email"
                autocomplete="email"
                placeholder="Email address"
                :class="[
                  fieldError('email') ? 'ring-red-300' : 'ring-gray-200',
                  'w-full rounded-xl px-3.5 py-2.5 text-sm text-gray-900 ring-1 transition placeholder:text-gray-400 focus:ring-brand-400 focus:outline-0',
                ]"
            />
            <p v-if="fieldError('email')" class="mt-1 text-xs text-red-600">{{ fieldError('email') }}</p>
          </div>
          <div>
            <input
                v-model="phone"
                type="tel"
                autocomplete="tel"
                placeholder="Phone number"
                :maxlength="PHONE_MAX"
                :class="[
                  fieldError('phone') ? 'ring-red-300' : 'ring-gray-200',
                  'w-full rounded-xl px-3.5 py-2.5 text-sm text-gray-900 ring-1 transition placeholder:text-gray-400 focus:ring-brand-400 focus:outline-0',
                ]"
            />
            <p v-if="fieldError('phone')" class="mt-1 text-xs text-red-600">{{ fieldError('phone') }}</p>
          </div>
        </div>
      </div>
      <div v-if="submitError" class="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <ExclamationTriangleIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ submitError }}</span>
      </div>
      <button
          type="submit"
          :disabled="!isComplete || isSubmitting"
          class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-800 focus-visible:outline-0 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
      >
        <Spinner v-if="isSubmitting" class="size-4" />
        {{ isSubmitting ? 'Booking your room…' : 'Book and continue to payment' }}
      </button>
    </div>
  </form>
</template>
