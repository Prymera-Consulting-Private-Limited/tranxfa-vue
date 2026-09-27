---
name: vue-conventions
description: House conventions for this Vue 3 + Tailwind client app — how to write models, composables, views and partials so new code matches what is already there. Use when adding or editing anything under src/ (a model class, an API call, a view, a component, Tailwind styling), or when deciding where a new file belongs.
---

# Conventions for this codebase

Vue 3 `<script setup>`, Vite, Tailwind v4, Pinia, axios, moment, lodash. No TypeScript.
Indentation: **4 spaces in `.js`, 2 spaces in `.vue`**.

There is a test suite: vitest + jsdom, run with `npm test`. Specs live **flat** in
`tests/` as `kebab-name.spec.js` - no directory tree, even for a deep feature. Name the
file after what it covers and prefix a feature area where the bare name would be
ambiguous (`travel-order-models.spec.js`, `customer-model.spec.js`). `tests/helpers.js`
and `tests/fixtures.js` hold the shared stubs and the captured API responses; reach for
those before hand-rolling a fixture.

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

Plain classes. Declared fields with a JSDoc `@type` and a `static getInstance(data)` that
maps snake_case payload keys to camelCase fields. Nest other models inside `getInstance`
instead of duplicating their fields. Never put API calls in a model - all 80 models are
clean of `axios`, and that is worth keeping.

All 80 have `getInstance`. Only 9 have `static getCollection(data)`, and **all 9 are under
`models/travel/`** - it is a travel-era convention, not an established one. Add it for a new
list-returning model by all means, but do not "fix" the older models to match; that is churn
across the whole layer.

Export style is `class Foo { … }` then `export default Foo` in 78 of 80 files. `customer.js`
and `customer_task.js` also name-export, and `customer_task.js` has **no default export at
all** - so it must be imported as `{CustomerTask}`. Match the majority in new files.

Watch the name collisions: `models/customer_task.js` and `enums/customer_task.js` both exist
and both export `CustomerTask`, which is why `DashboardView.vue` imports one under an alias.
`models/transaction_state.js` and `enums/transaction_state.js` collide the same way. Import
the full path and alias deliberately.

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
- **De-duplicate in-flight requests with a module-level promise** where several components
  can ask for the same thing at once - `customer_utils.refresh()` and `wallet_utils.probe()`
  both do this. Do not add a second caller path that bypasses the shared promise.
- Two older functions are **fire-and-forget and do not await their request**:
  `country_utils.getCountries()` and `getSources()` are `async` but return a *reactive
  container* that fills in later. `await getCountries()` hands you an empty array that is
  populated on a subsequent tick. Render from the reactive value; do not treat the return as
  resolved data. New composables should await properly.

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

## Shared helpers you are expected to use

`src/composables/api_utils.js` holds three helpers that exist because each one
cost somebody a debugging session. Reach for them rather than re-deriving:

- **`getCustomerMessage(error)`** — the message an API failure is safe to show a
  customer, or `null`. Our endpoints write their own failures ("this price has
  expired", "that room has gone") and those are better words than anything the
  SPA could invent. But an *unhandled* failure answers with Laravel's words
  (`No query results for model [App\Models\VasQuote] 00000000-…`). The helper
  identifies a debug payload by its `exception` key rather than guessing, so
  validation errors still pass through.
- **`reportUnexpectedError(error, context)`** — a `.catch()` covers the mapping
  code as well as the request, so a model that throws on a perfectly good 200
  lands in the same branch as a network failure. This logs only the *ours*
  case, since an axios error always carries `response` or `request`.
- **`getLabels(value)`** — PHP encodes an empty associative array as `[]`, so an
  endpoint with no labels answers with an array where every other answer is an
  object. A lookup against an array returns `undefined` and silently falls
  through to our own wording.

## Deployment flags

Never read a boolean from `import.meta.env` directly. Vite hands every variable
over as a **string**, so a bare read is truthy for `"false"`, `"0"` and `"off"`
— which is how a deployment ends up with a feature it asked to turn off.

```js
import {flag} from '@/feature_flags.js';

export function somethingEnabled() {
    return flag(import.meta.env.VITE_SOMETHING_ENABLED, /* fallback */ true);
}
```

`flag()` accepts `1/true/yes/on` as true and treats unset or empty as the
fallback. `src/feature_flags.js` holds product-wide flags (`travelEnabled()`),
`src/onboarding_config.js` the onboarding ones (`collectsAddress()`,
`verifiesMobileNumber()`, `authChannel()`). Add a named function next to those;
do not scatter `flag()` calls through components.

## Auth, and what actually protects a route

**There is no navigation guard.** Every route in `src/router/index.js` is
registered without `meta.requiresAuth` and without a `beforeEach` auth check.
The only thing keeping a signed-out customer out of `/dashboard` is the
response interceptor in `main.js`: a `401` pushes them to `signIn`.

Two consequences worth holding on to:

- A protected view will mount and render before its first request comes back
  401, so it must tolerate a null customer rather than assuming one.
- A request that must **not** bounce the customer to sign-in passes
  `skipAuthRedirect: true` in its axios config — used by mobile-number login,
  where a 401 is an expected answer rather than a lost session.

```js
axios.post('/client/v1/login', body, {skipAuthRedirect: true});
```

Session state is a Laravel Sanctum cookie; `withCredentials` and
`withXSRFToken` are on globally. The one place a component may call axios
directly is `axios.get('/sanctum/csrf-cookie')` in the auth views.

## Views and partials

The `IndexView` owns the composable, the loading and failure flags, and the fetch functions;
partials take props and emit events. Prop plumbing is preferred over a partial reaching for
the composable itself, so a page has one source of truth.

- Every state has visible markup: loading skeletons, a failure block, an empty block, results.
- Display strings are `computed`, not template expressions with logic in them.
- `defineProps` with `type` and `default` per prop; `defineEmits` as an array of names.
- A partial that edits parent data keeps its own copy and emits the result — never mutates a
  prop. The deliberate exception is `components/Payment/*.vue`, which write through
  `props.transaction`; see the `add-payment-provider` skill before copying that.

**Emit naming has two populations — match the local one, not a global rule.**

- Colon-namespaced (`recipient:add:failed`, `customer:attribute:updated`) in the
  backend-driven attribute-input families: `components/Recipient/**`,
  `components/CustomerAttribute/**`, and three hotel partials using `option:updated`.
- Plain camelCase (`retryPayment`, `emailVerified`, `close`, `confirm`) everywhere else -
  payments, wallet, the onboarding steps, travel views.

Roughly 35 files use the first and the rest use the second. Neither is being migrated.

**Prop types on model classes** are written two ways: `type: Country` (bare) and
`type: Object(Transaction)` (24 places). `Object(X)` on a class returns the class itself, so
the two are identical - the second is just noise. Prefer the bare form in new code and leave
the existing ones alone.
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
