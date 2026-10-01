# Architecture

The customer-facing SPA for the RemitSo remittance platform. A signed-in
customer gets a quote, picks or creates a recipient, confirms a transfer, pays
for it, and tracks it to payout. Everything the app knows comes from the
Laravel console API (`console.remitso`) under `/client/v1/*`.

## Stack

| Concern       | Choice                                          |
| ------------- | ----------------------------------------------- |
| Framework     | Vue 3, `<script setup>` SFCs only               |
| Build         | Vite 6                                          |
| State         | Pinia (3 small stores) + `reactive`/`ref` locals |
| Flow control  | XState 5 (`@xstate/vue`)                        |
| Styling       | Tailwind 4 via `@tailwindcss/vite`              |
| HTTP          | axios, global instance configured in `main.js`  |
| Realtime      | Laravel Echo → Reverb (local) / Pusher (hosted) |
| UI primitives | HeadlessUI, Heroicons, vue-select, PrimeIcons   |
| Tests         | vitest + jsdom + `@vue/test-utils`              |

There is no TypeScript. Types are conveyed with JSDoc on class fields, which is
also how editors get autocomplete on the model classes.

## The five layers

```
┌───────────────────────────────────────────────────────────┐
│ views/ · components/    Vue SFCs — presentation + wiring  │
├───────────────────────────────────────────────────────────┤
│ machines/               XState — which step am I on?      │
├───────────────────────────────────────────────────────────┤
│ composables/            use*Utils() — the only axios      │
├───────────────────────────────────────────────────────────┤
│ models/                 snake_case → camelCase mappers    │
├───────────────────────────────────────────────────────────┤
│ stores/ · enums/        shared state · backend constants  │
└───────────────────────────────────────────────────────────┘
```

The layering is consistent and worth preserving — it is the main reason the
codebase stays readable despite ~45 divergent forks.

### `models/` — dumb DTO mappers

Every model is a plain class with JSDoc-typed fields and one static factory:

```js
class Country {
    /** @type {string|null} */ iso2Alpha = null;

    static getInstance(data) {
        const country = new Country();
        country.iso2Alpha = data.iso2_alpha;   // snake → camel
        return country;
    }
}
```

Rules the codebase follows:

- No I/O, no formatting, no validation. Mapping only.
- Nested objects are mapped by delegating to the child's `getInstance`, always
  behind an `if (data.x)` guard — the API omits keys rather than nulling them.
- Money arrives **pre-formatted from the backend**: alongside `local_amount`
  you get `local_amount_formatted` and `local_amount_currency_prefixed`. The
  SPA never formats currency itself. Always render the `*Formatted` or
  `*CurrencyPrefixed` variant.
- Shared shape is factored into base classes that mutate an instance passed in
  rather than returning one: `BaseTransaction.getInstance(obj, data)` is called
  *by* `Transaction`/`Quote`/`TransactionQuote` for its side effects.

Inheritance chain:

```
BaseTransaction ── BaseQuote ── Quote              (calculator: rates, targets)
      │                      └─ TransactionQuote   (wizard: recipients, purposes)
      └─ Transaction                               (created: state, payment)
```

### `composables/` — the API layer

Each `use*Utils()` returns an object of async functions. This is the only place
`axios` appears (bar the CSRF cookie call). They are plain factories, not
singletons — calling `useQuoteUtils()` twice gives two independent `quote`
reactives, which the Calculator relies on.

| Composable                | Owns                                          |
| ------------------------- | --------------------------------------------- |
| `customer_utils`          | auth, profile, KYC tokens, documents, devices |
| `quote_utils`             | quote lifecycle through to confirm            |
| `recipient_utils`         | recipient CRUD, name lookup, send-money       |
| `payout_channel_utils`    | targets, methods, channel + its attributes    |
| `transaction_utils`       | transaction read, payment retry/confirm       |
| `wallet_utils`            | wallet subscription, balance, top-ups, OTP    |
| `resource_utils`          | relationships, occupations, salary ranges     |
| `country_utils`           | country list (cached in store)                |
| `password_policy_utils`   | policy (cached in store)                      |
| `monthly_budget_utils`    | budget read/write                             |
| `transaction_statement_utils` | statement requests                        |
| `aws_s3_utils`            | PUT to a presigned S3 URL                     |
| `color_utils`, `time_utils` | pure helpers, no I/O                        |

Two composables de-duplicate concurrent calls with a module-scoped promise —
`customer_utils.refresh()` and `wallet_utils.probe()`. Many components call
`refresh()` in `onMounted`; without this the app would stampede the profile
endpoint on every navigation.

### `stores/` — deliberately thin

Only four Pinia stores, holding what genuinely crosses view boundaries:

- `customer` — `{ isLoaded, customer: { data: Customer|null } }`. The single
  source of truth for who is signed in. The `customer.data` **object identity
  is replaced** on every refresh, so hold `customerStore.customer` (the
  wrapper) in components, not `customerStore.customer.data`.
- `countries`, `password_policy` — request caches with an `isLoaded` flag.
- `wallet` — availability state machine (see below) plus subscription/balance.

Everything else is component-local `ref`/`reactive`.

### `machines/` — navigation, not business logic

Three XState machines decide *which step renders*. They hold no data beyond
what the guards need; the actual mutations happen in the composables.

- `onboarding_navigation_machine` — email-first onboarding.
- `mobile_number_onboarding_navigation_machine` — mobile-first variant,
  selected by `VITE_AUTH_CHANNEL`.
- `transaction_navigation_machine` — the transfer wizard.
- `add_recipient_navigation_machine` — the add-recipient sub-wizard.

Two conventions matter:

**Guards are evaluated top-down, and the target list is ordered "furthest
first".** Sending a single `PROCEED` therefore lands the customer at the
furthest step they qualify for, which is what makes the flows resumable — a
customer returning mid-onboarding skips straight to the first incomplete step.

**Guards read the Pinia store directly, not machine context.** The machines
call `useCustomerStore()` at *module scope*:

```js
const customerStore = useCustomerStore();
const customer = customerStore.customer;
// ...
guards: { emailVerified: () => customer.data?.account?.isEmailVerified === true }
```

This is why Pinia must be active before these modules are imported, and why
guards see profile updates without any explicit `SET_CONTEXT`. The transfer
machine additionally keeps `quote` in context, updated via `SET_CONTEXT`.

## The transfer flow end to end

```
Dashboard
  └─ Calculator.vue
       GET  /client/v1/quote            (re-quotes on every input change)
       POST /client/v1/quote            → Quote id
       └─ route: /transfer/:quoteId
            GET /client/v1/quote/{id}   → TransactionQuote
            └─ transactionNavigationMachine
                 checkRecipients
                   ├─ addRecipient      AddRecipientWizard
                   ├─ selectRecipient   POST /quote/recipient/{id}
                   ├─ provideAddress    CustomerAttributeForm (address)
                   ├─ accountVerification  DocumentTypeItem → KYC provider
                   └─ confirm
                        POST /client/v1/quote/confirm/{id}
                        ├─ 2xx → Transaction  → /pay/:transactionId
                        └─ 412 → back to the step the `type` names
                             └─ /pay/:transactionId
                                  PaymentView → provider component
                                  └─ /payment/cb/:transactionId (redirect
                                     providers) → /transaction/:id
```

The wizard is unusual in that **the server decides the next step**. The client
sends `confirm`, and a `412` with a `type` pushes it back to `provideAddress`,
`accountVerification` or the identity-mismatch dialog. Guards on the machine
are a fast path; the 412 handler is the authority. See the error-handling table
in `CLAUDE.md`.

### Amount direction

`AmountType.SEND` vs `RECEIVE` tells the backend which side of the quote the
customer typed. The Calculator sets it on each edit and re-quotes; the response
authoritatively restates every field, which the Calculator copies back into its
local `query`. Never compute the other side client-side.

## Recipient creation

`AddRecipientWizard` walks target → payout method → recipient type → form,
**auto-skipping any step with exactly one option**. By the time it renders
`AttributeCollection`, it holds a `PayoutChannel` whose `attributes[]` fully
describe the form.

`AttributeCollection` is the most intricate component in the repo:

- Builds `input.data` and a parallel `errors` map keyed by attribute name.
  Phone/mobile types get **two** error keys (`.number`, `.country`) because the
  backend validates the parts separately.
- `componentMap` maps `attribute.type` → input component, falling back to
  `TextInput`. An unmapped type degrades silently.
- **Name lookup**: when `configuration.nameLookupRequirements` (or
  `nameValidationRequirements`) are all satisfied — length *and* regex checked
  client-side first — it debounces 1s and calls
  `GET /recipient/name-lookup/{channelId}`, then writes the returned name into
  the name field. The name input is read-only while lookup is configured.
- **Sub-delivery options** cascade: picking a `delivery_option` triggers
  `GET /resources/sub-delivery-options/{id}` and rewrites the sub-attribute's
  `options` in place.
- **Externally driven save**: inside the transfer wizard there is no local save
  button. The parent flips `externalSaveTrigger`, a `watchEffect` fires
  `addRecipient()`, and the result comes back as `recipient:added`.

## Payments

`PaymentView` opens a modal and dispatches on the provider code. Providers fall
into three shapes:

1. **Redirect** (`APAYLO`, `PAY360`, `CINET_PAY`, `FINCODE`, `PAY-CROSS`) —
   render a link to `payment.paymentUrl`, then wait. The customer returns via
   `/payment/cb/:transactionId`.
2. **Manual / bank transfer** (`MANUAL-PAYMENT`, `MONOOVA`, `PAGA`) — render
   `clientPaymentAccount` attributes with copy-to-clipboard, plus an
   "I've made payment" button (`POST /transaction/payment-sent/{paymentId}`).
3. **Embedded SDK** (`VOLUME-PAYMENTS`) — mounts a third-party widget into a
   container div. `WALLET` is a fourth, degenerate case: no customer action,
   just wait for the debit to settle.

All of them share the same state projection:

```js
CREATED | INITIALIZED | PENDING  → 'pending'
REDIRECTED                       → 'processing'
AUTHORIZED | CAPTURED            → 'completed'  → redirect to transaction
FAILED                           → 'failed'     → retry
```

`AUTHORIZED` and `CAPTURED` are treated identically by the SPA — the backend
deliberately stops polling at authorisation.

> **Known duplication.** `Monoova.vue`, `PagaPayment.vue` and
> `ManualPayment.vue` are ~95% identical, as are `Pay360.vue` / `CinetPay.vue`.
> The `status` computed above is copy-pasted into every provider. This is the
> single largest refactor opportunity in the repo; until it is done, a bug
> fixed in one provider must be fixed in all of them. The
> `add-payment-provider` skill exists partly to stop this getting worse.

## Account verification (KYC)

`documentType.api` selects a provider component, each of which normalises to
one event contract:

| Event                      | Meaning                                     |
| -------------------------- | ------------------------------------------- |
| `sdkInitialized`           | hide the parent's spinner                   |
| `sdkApplicantStatusChanged`| terminal success — parent refreshes + routes |
| `sdkCancelled`             | close the modal, no refresh                 |
| `sdkError`                 | surface an error                            |

Two mechanisms report completion, depending on the provider:

- **In-page SDK** (`SUMSUB`, `SUMSUB-VIA-FINCODE`, `CYBRID`→Persona,
  `DIDIT`) — the SDK's own
  callback fires the event.
- **Hosted redirect** (`UPPASS`, `SHUFTI`) — the SPA cannot observe the hosted
  page, so it subscribes to `client-customer.{id}` and treats the
  `CustomerDocumentUploaded` broadcast as completion.

`SYSTEM` is the in-house uploader: files go **straight to S3** via a presigned
URL obtained from `/account-verification/token/...`, and only the resulting
object key is POSTed to `/document/upload`. Document bytes never transit the
API. `PoiFileUpload` collects photo + back pages; `MultiFileUpload` takes an
arbitrary set with a 5 MB per-file cap.

## Travel (hotels)

A second product on the same session, merged from `feature/travel_hotels`. It
adds no runtime dependencies and touches the existing app in exactly two
places: nine routes in `router/index.js` and two nav entries in `Header.vue`.

| Layer | Path |
| ----- | ---- |
| Views | `src/views/Travel/Hotels/**`, `src/views/Travel/Bookings/**` |
| Models | `src/models/travel/**` (hotels, orders, money) |
| Composables | `src/composables/travel/**` |

The flow is search → hotel → quote (a held price) → prebook → guest details →
book → payment. The supplier is an Emerging Travel Group style API behind our
own client API, which is where most of its odd pricing and cancellation rules
come from.

Two things differ from the transfer side:

- **Confirmation is polled.** The booking-confirmed broadcast never fires, so
  the flow polls instead. Do not reintroduce a listener for it.
- **Payment is Volume**, read from `VITE_VOLUME_PAYMENT_*`. Travel is the only
  part of the app that reads those; the transfer components hardcode `SANDBOX`.

Licensing is a build flag (`VITE_TRAVEL_ENABLED`, default on) because nothing
on the customer indicates whether the deployment has the travel licence. Routes
answer 404 without it, so the flag only decides whether the tabs are shown.

## Wallet

The newest module, and the best-documented code in the repo — treat it as the
reference style. Availability is resolved by a **single probe request** whose
404 body is meaningful:

```
GET /client/v1/wallet/subscription
  200                                     → ACTIVE (or PAUSED if reacceptance_required)
  404 + {type, wallet_offered: true}      → ELIGIBLE   (not enrolled, can be)
  404 without a JSON type                 → UNAVAILABLE (deployment has no licence)
  anything else                           → UNKNOWN    (render nothing)
```

`UNKNOWN` rendering nothing is deliberate: a transient failure must not offer a
wallet the deployment may not be licensed for. Refusal reasons are enumerated
in `enums/wallet_refusal_type.js` and arrive as `type` on 4xx bodies.

## Auth and session

Cookie-based Laravel Sanctum, not tokens:

1. `GET /sanctum/csrf-cookie` before the first write.
2. `POST /client/v1/login` → profile payload.
3. If `mfaMethod !== null` → `/mfa`, else → `/workflow/onboarding`.
4. Onboarding machine routes to `/dashboard` on completion.

`axios` is configured globally with `withCredentials` and `withXSRFToken`, so
the session cookie must be on a domain the SPA shares with the API. A response
interceptor pushes to `signIn` on any `401`, which callers can opt out of with
`config.skipAuthRedirect = true`.

`VITE_AUTH_CHANNEL` (`EMAIL` | `MOBILE_NUMBER` | `BOTH`) selects the sign-in
surface and which onboarding machine drives `/workflow/onboarding`.

## Theming

One mechanism, in `assets/main.css`:

```css
@theme {
  --color-brand-700: theme('colors.purple.700');   /* per tenant */
}
```

Components only ever use `brand-*` utilities. Re-skinning a tenant is
remapping those ten variables plus swapping `public/images/`. Anything that
hardcodes a palette colour breaks white-labelling — see `docs/tenant-branches.md`
and the `rebrand-tenant` skill.

## Known rough edges

Recorded so they are not rediscovered:

- **`SignUpView` discards most 422 field errors.** It copies only
  `errors.email`, `errors.password` and `errors.confirm_password` into the
  form. Any other field error — `third_party_declaration_accepted` is the one
  you hit in practice — is dropped, and the user gets a Continue button that
  appears to do nothing. Confirmed against a live backend. The wizard's
  `confirmQuote` has a catch-all fallback for exactly this reason; signup does
  not.
- Server messages are rendered verbatim, so an unresolved backend translation
  key reaches the user as-is (e.g. a wrong email OTP shows
  `validation.customer.email_verification_code.incorrect`).
- Payment provider components are heavily duplicated (see above).
- `AwsRekognitionLivenessCheck.vue` is dead code with unsatisfied imports
  (`@tensorflow/tfjs-core`, `@tensorflow/tfjs-backend-webgl` are absent from
  `package.json`).
- `Sidebar.vue` is dead — static markup, `href="javascript:"`, not imported.
- `.env.example` is missing ~8 vars the code reads, and lists
  `VITE_DEV_SERVER_HOST` / `VITE_DEV_SERVER_HTTPS`, which nothing reads.
- `enums/review_answer.js` declares a class and never exports it.
- `Transaction.getInstance` does not set `id` itself; it relies on the
  `BaseTransaction.getInstance(transaction, data)` call at the *end* of the
  method. Reordering that line silently produces `id: undefined`.

Fixed on `main` but still live on older tenant branches — check before porting:

- `PaymentView.retryPayment` compared the computed object
  (`if (canAttemptPayment === false)`) instead of `.value`, so the attempt
  guard never fired.
- `PaymentState.TIMED_OUT` was `'TIMED_OUT'` while the backend sends
  `'TIMED-OUT'`, so that state never matched.
- `confirmQuote` had no fallback branch: an unrecognised `412 type`, a `5xx`,
  or a network error left `isStepProcessing` true and the spinner running
  forever.
