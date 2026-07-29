<script setup>
import {reactive, ref} from 'vue';
import {UserGroupIcon, UserIcon} from '@heroicons/vue/24/outline';

const props = defineProps({
  /**
   * Room occupancy from the search this attempt was booked under — one entry
   * per room, each seeding that many adult and child guest rows so nothing
   * has to be re-picked here.
   *
   * @type {Array<{adults: number, children: number[]}>}
   */
  guests: {
    type: Array,
    required: true,
  },

  genderRequired: {
    type: Boolean,
    default: false,
  },

  submitting: {
    type: Boolean,
    default: false,
  },

  submitFailed: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['submit']);

// Adult/child is fixed by the occupancy already priced at search — only the
// names, ages and (if required) gender are the customer's to fill in. Each
// guest gets a numbered label ("Adult 2") rather than a bare type, since a
// room commonly has more than one of either.
function buildRooms() {
  return props.guests.map(room => ({
    guests: [
      ...Array.from({length: room.adults}, (_, index) => ({
        label: `Adult ${index + 1}`, firstName: '', lastName: '', age: '', isChild: false, gender: '',
      })),
      ...(room.children ?? []).map((age, index) => ({
        label: `Child ${index + 1}`, firstName: '', lastName: '', age: String(age), isChild: true, gender: '',
      })),
    ],
  }));
}

const rooms = reactive(buildRooms());

// Email and phone come from the customer's own profile rather than being
// re-typed here — only the booking comment is this form's to collect.
const comment = ref('');

const formError = ref(null);

function validate() {
  for (const room of rooms) {
    for (const guest of room.guests) {
      if (!guest.firstName.trim() || !guest.lastName.trim()) {
        return 'Please enter a first and last name for every guest.';
      }

      const age = Number(guest.age);

      if (guest.age === '' || Number.isNaN(age) || age < 0 || age > 120) {
        return 'Please enter a valid age for every guest.';
      }

      if (props.genderRequired && !guest.gender) {
        return 'Please select a gender for every guest.';
      }
    }
  }

  return null;
}

function submit() {
  const error = validate();

  if (error) {
    formError.value = error;
    return;
  }

  formError.value = null;

  emit('submit', {
    rooms: rooms.map(room => ({
      guests: room.guests.map(guest => ({
        first_name: guest.firstName.trim(),
        last_name: guest.lastName.trim(),
        age: Number(guest.age),
        is_child: guest.isChild,
        ...(props.genderRequired ? {gender: guest.gender} : {}),
      })),
    })),
    comment: comment.value.trim() || null,
  });
}
</script>

<template>
  <section class="rounded-2xl bg-white p-5 ring-1 ring-gray-200 sm:p-6">
    <div class="flex items-center gap-2">
      <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <UserGroupIcon class="size-4" aria-hidden="true" />
      </span>
      <h2 class="text-base font-semibold text-gray-900">Guest details</h2>
    </div>
    <p class="mt-1 text-sm text-gray-500">Enter every guest exactly as it appears on their ID.</p>

    <form class="mt-6 divide-y divide-gray-100" @submit.prevent="submit">
      <div v-for="(room, roomIndex) in rooms" :key="roomIndex" :class="[roomIndex ? 'pt-6' : '', 'pb-6']">
        <div class="flex items-center gap-2">
          <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-500">{{ roomIndex + 1 }}</span>
          <h3 class="text-xs font-semibold tracking-wide text-gray-500 uppercase">Room {{ roomIndex + 1 }}</h3>
        </div>
        <div class="mt-3 space-y-3">
          <div v-for="(guest, guestIndex) in room.guests" :key="guestIndex" class="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
            <div class="flex items-center gap-1.5">
              <UserIcon class="size-3.5 text-gray-400" aria-hidden="true" />
              <span class="text-xs font-medium text-gray-600">{{ guest.label }}</span>
            </div>
            <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="block text-xs font-medium text-gray-700">First name</label>
                <input
                    v-model="guest.firstName"
                    type="text"
                    class="mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700">Last name</label>
                <input
                    v-model="guest.lastName"
                    type="text"
                    class="mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700">Age</label>
                <div class="relative mt-1">
                  <input
                      v-model="guest.age"
                      type="number"
                      min="0"
                      max="120"
                      class="block w-full rounded-lg border-0 bg-white py-2 pl-3 pr-14 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
                  />
                  <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-gray-400">years</span>
                </div>
              </div>
              <div v-if="genderRequired">
                <label class="block text-xs font-medium text-gray-700">Gender</label>
                <select
                    v-model="guest.gender"
                    class="mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
                >
                  <option value="" disabled>Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="pt-6">
        <label class="block text-xs font-medium text-gray-700">Booking comment <span class="font-normal text-gray-400">(optional)</span></label>
        <textarea
            v-model="comment"
            rows="3"
            class="mt-1 block w-full rounded-lg border-0 px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
        />

        <p v-if="formError" class="mt-4 text-sm text-red-600">{{ formError }}</p>
        <p v-if="submitFailed" class="mt-4 text-sm text-red-600">Something went wrong submitting your details. Please try again.</p>

        <button
            type="submit"
            :disabled="submitting"
            class="mt-6 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0 disabled:cursor-not-allowed disabled:opacity-60"
        >{{ submitting ? 'Submitting…' : 'Continue' }}</button>
      </div>
    </form>
  </section>
</template>
