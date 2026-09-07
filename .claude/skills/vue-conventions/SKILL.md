---
name: vue-conventions
description: House conventions for this Vue 3 + Tailwind client app — how to write models, composables, views and partials so new code matches what is already there. Use when adding or editing anything under src/ (a model class, an API call, a view, a component, Tailwind styling), or when deciding where a new file belongs.
---

# Conventions for this codebase

Vue 3 `<script setup>`, Vite, Tailwind v4, Pinia, axios, moment, lodash. No TypeScript,
no test suite. Indentation: **4 spaces in `.js`, 2 spaces in `.vue`**.

## Where things go

| Kind | Path | Naming |
| --- | --- | --- |
| API models | `src/models/**.js` | `snake_case.js`, one class per file |
| API calls + view state | `src/composables/**_utils.js` | `use<Thing>Utils()` |
| Routed pages | `src/views/<Area>/<Feature>/IndexView.vue` | registered in `src/router/index.js` |
| Page-local components | `src/views/<Area>/<Feature>/Partials/*.vue` | one concern per file |
| Shared components | `src/components/**` | grouped by domain folder |
| Pinia stores | `src/stores/*.js` | setup syntax, `use<Thing>Store` |

Deep feature trees mirror the API: `src/models/travel/hotels/hotel_rate.js`.

## Models

Plain classes. Declared fields with a JSDoc `@type`, a `static getInstance(data)` that maps
snake_case payload keys to camelCase fields, and `static getCollection(data)` when the API
returns lists. Nest other models inside `getInstance` instead of duplicating their fields.
Never put API calls in a model.

```js
import Country from "@/models/country.js";

class Region {
    /**
     * @type {string|null}
     */
    id = null;

    /**
     * @type {Country|null}
     */
    country = null;

    static getInstance(data) {
        const region = new Region();

        region.id = data.id;
        region.regionType = data.region_type;

        if (data.country) {
            region.country = Country.getInstance(data.country);
        }

        return region;
    }

    /**
     * @param {Array} data
     * @returns {Region[]}
     */
    static getCollection(data) {
        return data.map(item => Region.getInstance(item));
    }
}

export default Region;
```

Static helpers on the model are fine for shaping its own data (see `Hotel.getAddress`).

## Composables

One file per domain, holding both the axios calls and the reactive state a page needs.
`axios` is pre-configured in `src/main.js` (`baseURL`, credentials, interceptors), so call
relative paths like `/client/v1/travel/hotels/search/region` directly.

- Return the axios promise and let the caller map the payload through the model
  (`Hotel.getCollection(response.data.hotels)`), so loading and error state stay in the view.
- Query strings go in `{params: {...}}` — a bare object is the axios *config*, not params, and
  silently sends nothing.
- Pure helpers that need no state are top-level named exports in the same file
  (`getPhotoUrl`, `prettifyLabel`, `getCheapestRate`), not part of the returned object.
- Shared limits and constants are exported from the composable so the UI and any URL or
  payload parsing enforce the same numbers.

```js
export function useHotelUtils() {
    const criteria = ref(getCriteria());

    async function regions(query = null) {
        return await axios.get('/client/v1/travel/hotels/catalog/regions', {
            params: {q: query},
        });
    }

    return {criteria, regions};
}
```

## Views and partials

The `IndexView` owns the composable, the loading and failure flags, and the fetch functions;
partials take props and emit events. Prop plumbing is preferred over a partial reaching for
the composable itself, so a page has one source of truth.

- Every state has visible markup: loading skeletons, a failure block, an empty block, results.
- Display strings are `computed`, not template expressions with logic in them.
- `defineProps` with `type` and `default` per prop; `defineEmits` as an array of names.
- A partial that edits parent data keeps its own copy and emits the result — never mutates a prop.
- Guard against races on typed input with a request counter, so a slow reply cannot overwrite
  a newer one.

## Styling

Tailwind utilities inline, no scoped CSS unless overriding a third-party widget (then a single
`:deep()` rule). `src/assets/main.css` owns the theme: `brand-50…900` aliases the sky palette,
plus the datepicker CSS variables — use `brand-*`, never raw `sky-*`.

Patterns already in use: `size-4` over `h-4 w-4`; `cursor-pointer` on every button;
`focus-visible:outline-0`; `transition` on anything that changes on hover; `rounded-xl`
controls and `rounded-2xl` cards; `text-gray-500` secondary text and `text-gray-400` hints;
`tabular-nums` on counters; `truncate` plus `min-w-0` inside flex rows. Hover states darken a
step (`hover:bg-brand-800`) rather than fading with an opacity suffix.

Libraries to reach for before hand-rolling: `@headlessui/vue` (`Popover`, `Combobox` — note
v1.7 only auto-opens a combobox on typing, so add a `ComboboxButton` for browsing),
`@heroicons/vue/24/outline` (solid only for filled marks like stars), `@vuepic/vue-datepicker`,
`lodash` `debounce` (300ms for lookups), `moment` for all date maths and formatting.

## Comments

Comment the *why* — a supplier quirk, a constraint, a race, a layout reason. Never narrate what
the next line does, and never leave a comment that would read as noise to the person who wrote
the code. Sentence case, above the code, no trailing full stop on short section markers
(`<!-- Destination -->`). If a value looks arbitrary, the comment explains where it came from.
