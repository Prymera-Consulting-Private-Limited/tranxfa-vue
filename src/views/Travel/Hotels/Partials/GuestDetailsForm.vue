<script setup>
import {computed, reactive, ref, watch} from 'vue';
import {ExclamationTriangleIcon, InformationCircleIcon, UserGroupIcon, UserIcon} from '@heroicons/vue/24/outline';

const props = defineProps({
  /**
   * The attempt's own rooms and guest slots (HotelBooking.rooms) — created
   * server-side with real ids as soon as the attempt was, one guest per
   * adult/child the search priced the room for. These slots are fixed by the
   * original search and can't be added to or removed here, only filled in.
   *
   * @type {Array<{id: string, roomNumber: number, guests: {id: string, isChild: boolean, age: number|null}[]}>}
   */
  rooms: {
    type: Array,
    required: true,
  },

  genderRequired: {
    type: Boolean,
    default: false,
  },

  /**
   * The real message from the last failed save that isn't a 422 — a 409 once
   * the attempt has moved on, or a generic network failure. 422s are carried
   * in validationErrors instead, since they need to be attributed to specific
   * fields and rooms rather than shown as one flat message.
   */
  submitError: {
    type: String,
    default: null,
  },

  /**
   * The raw `errors` object off a 422 response, Laravel's standard shape:
   * "guests" holds whole-request messages (e.g. a room missing a named
   * adult), "guests.{index}.{field}" holds a message for one field of one
   * guest — {index} is that guest's position in the payload this form last
   * sent, not its id.
   */
  validationErrors: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['submit', 'update']);

// Adult/child is fixed by the occupancy already priced at search — only the
// names, ages and (if required) gender are the customer's to fill in. Each
// guest gets a numbered label ("Adult 2") rather than a bare type, since a
// room commonly has more than one of either.
function buildRooms() {
  return props.rooms.map(room => {
    let adultCount = 0;
    let childCount = 0;

    return {
      id: room.id,
      guests: room.guests.map(guest => {
        const label = guest.isChild ? `Child ${++childCount}` : `Adult ${++adultCount}`;

        return {
          id: guest.id,
          label,
          firstName: '',
          lastName: '',
          age: guest.age !== null ? String(guest.age) : '',
          isChild: guest.isChild,
          gender: '',
        };
      }),
    };
  });
}

const rooms = reactive(buildRooms());

const formError = ref(null);

// The order guests were last actually sent in, so a field error keyed by
// payload position ("guests.1.age") can be traced back to the guest it's
// really about, since that position has nothing to do with room/guest order.
const lastSubmittedIds = ref([]);

/**
 * The supplier would rather have no data than made-up data: a guest with no
 * name typed in simply isn't sent, instead of going in with a placeholder.
 * "partial" catches a name half-typed, since that's neither a real guest nor
 * an intentionally skipped one.
 *
 * @param {{firstName: string, lastName: string}} guest
 * @returns {'named'|'partial'|'empty'}
 */
function guestStatus(guest) {
  const hasFirst = guest.firstName.trim().length > 0;
  const hasLast = guest.lastName.trim().length > 0;

  if (hasFirst && hasLast) {
    return 'named';
  }

  if (hasFirst || hasLast) {
    return 'partial';
  }

  return 'empty';
}

/**
 * The supplier requires a name for at least one adult per room, even when
 * every other guest is left blank.
 *
 * @param {{isChild: boolean, firstName: string, lastName: string}[]} guests
 * @returns {boolean}
 */
function roomHasNamedAdult(guests) {
  return guests.some(guest => !guest.isChild && guestStatus(guest) === 'named');
}

// Whole-request messages ("Room 2 needs genuine name details for at least one
// adult") live under the plain "guests" key — there can be more than one, one
// per room still missing an adult, and every one of them should show, not just
// the first.
const formErrors = computed(() => props.validationErrors?.guests ?? []);

// The backend names the room in the message itself, so this pulls that number
// out to show the error at that specific room instead of only in one lump at
// the top. Anything that doesn't match a leading "Room N" still shows up top.
const formErrorsByRoom = computed(() => {
  const byRoom = {};

  for (const message of formErrors.value) {
    const match = message.match(/^Room (\d+)\b/);

    if (match) {
      const roomIndex = Number(match[1]) - 1;

      (byRoom[roomIndex] ??= []).push(message);
    }
  }

  return byRoom;
});

const unattributedFormErrors = computed(() => {
  return formErrors.value.filter(message => !/^Room \d+\b/.test(message));
});

const KNOWN_GUEST_FIELDS = ['first_name', 'last_name', 'age', 'gender'];

// Field errors are keyed "guests.{index}.{field}" by the guest's position in
// the last request, not its id — this re-keys them by id instead, so they can
// be looked up per guest regardless of how the payload was ordered.
const fieldErrorsByGuestId = computed(() => {
  const byGuestId = {};

  if (!props.validationErrors) {
    return byGuestId;
  }

  for (const [key, messages] of Object.entries(props.validationErrors)) {
    const match = key.match(/^guests\.(\d+)\.(.+)$/);

    if (!match) {
      continue;
    }

    const guestId = lastSubmittedIds.value[Number(match[1])];

    if (!guestId) {
      continue;
    }

    (byGuestId[guestId] ??= {})[match[2]] = messages;
  }

  return byGuestId;
});

function fieldError(guest, field) {
  return fieldErrorsByGuestId.value[guest.id]?.[field]?.[0] ?? null;
}

// Errors on a field this form doesn't expose directly (e.g. "id", if a slot
// no longer matches the attempt) still need to surface somewhere on that guest.
function otherGuestErrors(guest) {
  const errors = fieldErrorsByGuestId.value[guest.id];

  if (!errors) {
    return [];
  }

  return Object.entries(errors)
      .filter(([field]) => !KNOWN_GUEST_FIELDS.includes(field))
      .flatMap(([, messages]) => messages);
}

// The sidebar mirrors whichever names have actually been typed in, so it
// stays live as the customer fills the form rather than only after submit.
watch(rooms, () => {
  emit('update', rooms.map(room => ({
    id: room.id,
    guests: room.guests.map(guest => ({
      firstName: guest.firstName.trim(),
      lastName: guest.lastName.trim(),
      isChild: guest.isChild,
      named: guestStatus(guest) === 'named',
    })),
  })));
}, {deep: true, immediate: true});

function validate() {
  for (const room of rooms) {
    if (!roomHasNamedAdult(room.guests)) {
      return 'Enter a name for at least one adult in every room.';
    }

    for (const guest of room.guests) {
      const status = guestStatus(guest);

      if (status === 'partial') {
        return 'Enter both a first and last name for each guest, or leave both blank.';
      }

      if (status === 'empty') {
        continue;
      }

      if (guest.age !== '') {
        const age = Number(guest.age);

        if (Number.isNaN(age) || age < 0 || age > 120) {
          return 'Please enter a valid age.';
        }
      }

      if (props.genderRequired && !guest.gender) {
        return 'Please select a gender for every named guest.';
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

  // A flat list keyed by each guest's own slot id — which room a guest
  // belongs to is already fixed server-side, so the request need not nest by
  // room. Guests left blank are omitted rather than sent with empty or
  // made-up details, since the supplier only wants genuine data it was
  // actually given.
  const guests = rooms
      .flatMap(room => room.guests)
      .filter(guest => guestStatus(guest) === 'named')
      .map(guest => ({
        id: guest.id,
        first_name: guest.firstName.trim(),
        last_name: guest.lastName.trim(),
        age: guest.age !== '' ? Number(guest.age) : null,
        ...(props.genderRequired ? {gender: guest.gender || null} : {}),
      }));

  lastSubmittedIds.value = guests.map(guest => guest.id);

  emit('submit', {guests});
}

// Client-side validation wins outright when both are present, since it's
// already stale the moment the customer changes anything; server errors from
// the last save stay visible until they try again.
const topErrors = computed(() => {
  if (formError.value) {
    return [formError.value];
  }

  const messages = [...unattributedFormErrors.value];

  if (props.submitError) {
    messages.push(props.submitError);
  }

  return messages;
});
</script>

<template>
  <section class="rounded-2xl bg-white p-5 ring-1 ring-gray-200 sm:p-6">
    <div class="flex items-center gap-2">
      <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <UserGroupIcon class="size-4" aria-hidden="true" />
      </span>
      <h2 class="text-base font-semibold text-gray-900">Guest details</h2>
    </div>
    <div class="mt-4 flex items-start gap-3 rounded-xl bg-blue-50 p-4 ring-1 ring-inset ring-blue-200">
      <InformationCircleIcon class="mt-0.5 size-5 shrink-0 text-blue-600" aria-hidden="true" />
      <p class="text-sm text-blue-800">Enter names exactly as they appear on ID — don't know everyone's details yet? No problem, just leave their fields blank for now, as long as one adult per room is filled in.</p>
    </div>
    <!-- Right under the info box, not buried at the bottom of the form, since
    the button that triggers it lives in the sidebar and won't scroll this into view. -->
    <div v-if="topErrors.length" class="mt-3 flex items-start gap-3 rounded-xl bg-red-50 p-4 ring-1 ring-inset ring-red-200">
      <ExclamationTriangleIcon class="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden="true" />
      <ul class="space-y-1 text-sm text-red-800">
        <li v-for="(message, index) in topErrors" :key="index">{{ message }}</li>
      </ul>
    </div>

    <!-- The submit button lives in the sidebar, after the price — this id is
    how a button outside this form still submits it. -->
    <form id="guest-details-form" class="mt-6 divide-y divide-gray-100" @submit.prevent="submit">
      <div v-for="(room, roomIndex) in rooms" :key="room.id" class="py-6">
        <div class="flex items-center gap-2">
          <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-500">{{ roomIndex + 1 }}</span>
          <h3 class="text-xs font-semibold tracking-wide text-gray-500 uppercase">Room {{ roomIndex + 1 }}</h3>
        </div>
        <div class="mt-3 divide-y divide-gray-100">
          <div v-for="(guest, guestIndex) in room.guests" :key="guest.id" :class="[guestIndex ? 'pt-4' : '', 'pb-4']">
            <div class="flex items-center gap-1.5">
              <UserIcon class="size-3.5 text-gray-400" aria-hidden="true" />
              <span class="text-xs font-medium text-gray-600">{{ guest.label }}</span>
              <span
                  v-if="guestStatus(guest) === 'named'"
                  class="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700"
              >Included</span>
              <span
                  v-else-if="guestStatus(guest) === 'partial'"
                  class="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
              >Missing a name</span>
              <span
                  v-else
                  class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500"
              >No details yet</span>
            </div>
            <p v-for="(message, index) in otherGuestErrors(guest)" :key="index" class="mt-1 text-xs font-medium text-red-600">{{ message }}</p>
            <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label class="block text-xs font-medium text-gray-700">First name</label>
                <input
                    v-model="guest.firstName"
                    type="text"
                    :name="`first-name-${guest.id}`"
                    autocomplete="given-name"
                    class="mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
                />
                <p v-if="fieldError(guest, 'first_name')" class="mt-1 text-xs text-red-600">{{ fieldError(guest, 'first_name') }}</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700">Last name</label>
                <input
                    v-model="guest.lastName"
                    type="text"
                    :name="`last-name-${guest.id}`"
                    autocomplete="family-name"
                    class="mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
                />
                <p v-if="fieldError(guest, 'last_name')" class="mt-1 text-xs text-red-600">{{ fieldError(guest, 'last_name') }}</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700">Age <span class="font-normal text-gray-400">(optional)</span></label>
                <div class="relative mt-1">
                  <input
                      v-model="guest.age"
                      type="number"
                      min="0"
                      max="120"
                      :name="`age-${guest.id}`"
                      autocomplete="off"
                      class="block w-full rounded-lg border-0 bg-white py-2 pl-3 pr-14 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
                  />
                  <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-gray-400">years</span>
                </div>
                <p v-if="fieldError(guest, 'age')" class="mt-1 text-xs text-red-600">{{ fieldError(guest, 'age') }}</p>
                <p v-else-if="guest.isChild" class="mt-1 text-xs text-gray-400">From your search — change only to correct it.</p>
              </div>
            </div>
            <div v-if="genderRequired" class="mt-3 sm:max-w-[calc((100%-1.5rem)/3)]">
              <label class="block text-xs font-medium text-gray-700">Gender</label>
              <select
                  v-model="guest.gender"
                  :name="`gender-${guest.id}`"
                  autocomplete="sex"
                  class="mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
              >
                <option value="" disabled>Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <p v-if="fieldError(guest, 'gender')" class="mt-1 text-xs text-red-600">{{ fieldError(guest, 'gender') }}</p>
            </div>
          </div>
        </div>
        <!-- The backend's own message, when there is one for this room, is more -->
        <!-- authoritative than the plain client-side reminder. -->
        <template v-if="formErrorsByRoom[roomIndex]?.length">
          <p v-for="(message, index) in formErrorsByRoom[roomIndex]" :key="index" class="mt-3 text-xs font-medium text-red-600">{{ message }}</p>
        </template>
        <p v-else-if="!roomHasNamedAdult(room.guests)" class="mt-3 text-xs font-medium text-amber-600">
          Add a name for at least one adult in this room before continuing.
        </p>
      </div>
    </form>
  </section>
</template>
