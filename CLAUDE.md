# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

`tranxfa-vue` is the **customer-facing SPA** for the RemitSo remittance
platform: Vue 3 (`<script setup>`) + Vite + Pinia + XState + Tailwind 4.
It talks to the Laravel console (`console.remitso`) over `/client/v1/*`.

This repo is **white-labelled by branch**, not by config. `main` is the
product mainline; every `<brand>_staging` / `<brand>_production` branch is a
long-lived fork for one deployment. Read `docs/tenant-branches.md` before
merging, cherry-picking, or "just fixing it on staging".

Architecture lives in `docs/architecture.md`. The API surface the SPA actually
uses is enumerated in `docs/api-surface.md` (the API *itself* is documented in
the console's API Documentation page, which is authoritative). Local end-to-end
setup is in `docs/local-development.md`. Deployment is `DEPLOY.md`.

## Working conventions

Carried over from `console.remitso`, where they were learned the hard way:

- **PRs target `main`.** Never open an ordinary PR against `staging` or a brand
  branch. `staging` is the Tranxfa brand branch, not an integration branch.
- **No `Co-Authored-By` or generated-with trailers**, in commits or PR bodies.
- Short imperative commit subject, reasoning in the body: why the change
  exists, not what the diff shows. Plain hyphens, no em-dashes.
- **Stage the change and stop** for review before committing. Group into
  logical commits, one concern each.
- Change only what the task needs. Spotting an unrelated problem is not
  permission to fix it - mention it, or raise it separately. If the task
  genuinely cannot be done without a surrounding change, say so in one
  sentence, then do it.
- **Never silently drop something worth doing.** If you decide against
  something the work needs, say so at the moment you decide. A silent omission
  looks like a finished feature.
- A push to a brand branch **is a deploy** (Amplify builds on push). Verify
  before pushing, not after.

## Layering (do not short-circuit it)

```
views/ + components/    Vue SFCs. Presentation and orchestration.
machines/               XState machines. Multi-step flow navigation only.
composables/            use*Utils(). THE ONLY PLACE axios is called.
models/                 Plain classes. snake_case API -> camelCase. No I/O.
stores/                 Pinia. Cross-view shared state only.
enums/                  Object.freeze() maps of backend string codes.
```

- **Never call `axios` from a component.** Add a function to the relevant
  `composables/*_utils.js` instead. The one deliberate exception is
  `axios.get('/sanctum/csrf-cookie')` in the auth views.
- **Models are dumb mappers.** `static getInstance(data)` reads snake_case and
  assigns camelCase. No fetching, no formatting, no validation. Predicate
  helpers that read only the instance's own fields (`Wallet.balanceFor`,
  `Customer.identityInformationRequired`) are fine.
- **Enums mirror backend strings exactly.** A typo here fails silently —
  `v-if` just never matches. `PaymentState.TIMED_OUT` was `'TIMED_OUT'` for
  months while the backend sent `'TIMED-OUT'`; nothing threw.

## Backend-driven UI

Large parts of this app are rendered from metadata the API returns, not from
code in this repo. Before adding a field, check whether the backend already
describes it:

- **Recipient forms** — `payoutChannel.attributes[]` carry `type`, `label`,
  `is_required`, `regex_pattern`, `min/max/exact_length`, `mask`, `options`.
  `AttributeCollection.vue` maps `attribute.type` to a component via
  `componentMap`. A new `type` needs an entry there or it silently falls back
  to `TextInput`.
- **Customer/onboarding forms** — `customer.attributes[]` with a `category`
  (`identity` / `address` / `employment`). `FormGroup.vue` dispatches on
  `attr.attribute` **by name string** (`'birth_detail.birth_date'`,
  `'employment.occupation_id'`), not by type.
- **Payment fields** — `paymentProvider.paymentDataAttributes[]`.

Dotted attribute names (`employment.occupation_id`) are un-flattened into
nested request objects by `updateProfileAttribute()`. Keep that convention.

## Onboarding is configurable per brand

`VITE_AUTH_CHANNEL` picks which machine drives `/workflow/onboarding`, and each
one collects the contact detail the signup channel did not.

**`BOTH` is not a third flow.** It means the brand accepts either signup, so the
machine is resolved per customer from what they already have: no email address
means they arrived by phone. `resolveOnboardingChannel()` owns that decision,
and `OnboardingWorkflowView` therefore loads the profile *before* mounting
`OnboardingFlow` - `useMachine` runs once at setup, so the choice cannot be
revisited. Handing the email-first machine a mobile-only customer strands them
on a screen asking them to verify an email they never gave.

The two flows:

- **email-first** (`onboarding_navigation_machine`) - collects the mobile
  number, and verifies it when `VITE_ONBOARDING_VERIFY_MOBILE_NUMBER` is on.
- **mobile-first** (`mobile_number_onboarding_navigation_machine`) - collects
  and verifies the email. The number is already proven by the signup OTP, so
  there is deliberately no mobile verification step here.

`src/onboarding_config.js` owns both flags, parsing them with the shared `flag()`
from `src/feature_flags.js`. Read any boolean deployment flag through one of
those rather than `import.meta.env`: Vite hands every variable over as a
**string**, so a bare `import.meta.env.X` is truthy for `"false"`, `0` and `off`.

Two rules when adding an optional step:

- **Gate both halves of the guard pair.** `requiresX()` decides whether to ask;
  `xCompleted()` is the prefix every later guard chains through. Gating only
  the first makes every subsequent step unreachable.
- **Optional in onboarding is not optional everywhere.** Turning off address
  collection only skips the onboarding step - the transfer wizard still asks
  when the backend answers `412 incomplete_customer_address`.

## Travel is a licensed second product

Hotels sit alongside transfers: nine routes under `/travel/*`, `src/views/Travel/**`,
`src/models/travel/**`, `src/composables/travel/**`. It shares the customer, the
auth session and the payment layer, and nothing else.

**It is licensed per deployment and nothing on the customer says so.** Without
the licence every travel route answers 404. `travelEnabled()` in
`src/feature_flags.js` reads `VITE_TRAVEL_ENABLED` and gates the Hotels and
Bookings entries in `Header.vue`. It defaults **on**, so a brand that does not
sell travel must set it to `false` or its customers see tabs leading to 404s.
The flag is a stand-in until app and domain scoping supplies a real field.

Travel takes payment through Volume, configured by
`VITE_VOLUME_PAYMENT_MERCHANT_ID` and `VITE_VOLUME_PAYMENT_ENVIRONMENT`
(`SANDBOX` when unset, so a deployment that forgets it takes no money rather
than the wrong money). The transfer components still hardcode `SANDBOX`; only
travel reads the variable.

Booking confirmation is **polled**, not broadcast — the event the flow
originally waited on never fires. See the `hotel-search` skill.

## Provider registries

Two places dispatch on a backend string code. Both are plain `v-if` chains —
adding a provider means editing the chain, there is no registry object:

- `views/Transfer/PaymentView.vue` on `payment.paymentProvider.code`:
  `MANUAL-PAYMENT`, `PAGA`, `MONOOVA`, `VOLUME-PAYMENTS`, `APAYLO`, `PAY360`,
  `CINET_PAY`, `FINCODE`, `PAY-CROSS`, `WALLET`.
- `components/AccountVerification/DocumentTypeItem.vue` on `documentType.api`:
  `SUMSUB` and `SUMSUB-VIA-FINCODE` (both → `Sumsub.vue`, listed in
  `SUMSUB_APIS`), `UPPASS`, `CYBRID` (→ `Persona.vue`, the name really does
  not match), `SHUFTI`, `DIDIT`, `SYSTEM`.

Neither chain has a fallback branch, so an unrecognised code renders nothing
and leaves the customer on a spinner. `tests/kyc-provider-dispatch.spec.js`
pins the KYC chain.

Use the `add-payment-provider` / `add-kyc-provider` skills — they encode the
event contract and the lifecycle traps.

## Realtime

Laravel Echo is a **global** (`window.Echo`), configured in `main.js`. It is
Reverb when `VITE_APP_ENV === 'local'`, Pusher otherwise.

Every `Echo.channel(...)` in `onMounted` **must** have a matching
`Echo.leaveChannel(...)` in `onUnmounted`. Channels in use:

- `client-customer.{customerId}` — `CustomerDocumentUploaded`,
  `CustomerDocumentProcessing`, `CustomerDocumentApproved`,
  `CustomerDocumentRejected`
- `client-payment.{paymentId}` — `PaymentTransactionStateUpdated`
- `client-transaction.{transactionId}` — transaction state updates

Websockets should be an optimisation, never the only path. All ten payment
components pair `channel` with `leaveChannel`, but only five also poll
`getTransaction` — `Fincode`, `Pay360`, `PayCross`, `ManualPayment`, `Wallet`.
`Apaylo`, `CinetPay`, `Monoova`, `PagaPayment` and `Volume` trust the socket
alone, so a customer whose socket never connects waits on a screen that never
advances. Write new providers with both, and clear the interval on unmount and
on reaching a terminal state.

## Conventions

- Comments explain **why**, never what the next line does. The wallet module
  (`composables/wallet_utils.js`, `models/wallet_*.js`) is the reference for
  the standard the codebase is moving toward — match it in new code.
- Props are declared with full `type:`/`required:` and passed `v-bind:foo="…"`.
- Child→parent uses `defineEmits`. Two naming populations, both current: colon-
  namespaced (`recipient:add:failed`, `customer:attribute:updated`) in the
  attribute-input families under `components/Recipient/**` and
  `components/CustomerAttribute/**`; plain camelCase (`retryPayment`,
  `emailVerified`) everywhere else. Match the file you are in.
- Brand colour is **always** `brand-*` (`bg-brand-700`), never a literal
  palette name. `--color-brand-*` is remapped per tenant in `assets/main.css`.
  A hardcoded `purple-700` will not re-skin and is a bug.
- Tests are `tests/*.spec.js` (vitest + jsdom), **flat** — no directory tree,
  kebab-case, named after what they cover, with a feature prefix where the bare
  name would be ambiguous (`travel-order-models`, `customer-model`). `npm test`.
  `tests/helpers.js` has `installFakeEcho()`, `makeTransaction()` and the modal
  stubs, `tests/fixtures.js` loads captured API responses — use them rather than
  hand-rolling. `tests/axios-contract.spec.js` is the one spec that does **not**
  mock axios; it pins the rejection shape the rest of the app branches on.
  Use the `write-tests` skill — it covers the Pinia-before-import rule, the
  axios mock shape, and which silent failures are worth pinning.

## Error handling contract

`POST /client/v1/quote/confirm/{id}` drives the transfer wizard through
non-2xx responses. `412` bodies carry a `type`:

| `type`                        | Wizard action                          |
| ----------------------------- | -------------------------------------- |
| `incomplete_customer_address` | → `provideAddress` step                |
| `account_verification_required` | → `accountVerification`, reads `pending_documents` |
| `poi_info_check_failed`       | → identity-mismatch dialog             |
| `duplicate_transaction`       | inline warning                         |
| `active_transfer_disable_rule`| inline warning                         |
| wallet refusals               | see `enums/wallet_refusal_type.js`     |

**Any unrecognised `type`, and any non-412/422 failure, must still clear
`isStepProcessing` and show a message.** `tests/transfer-confirm-refusals.spec.js`
locks this in. The pre-`main` version of this code left the spinner running
forever on an unknown error — do not reintroduce that shape.

## Gotchas

- `machines/*.js` call `useCustomerStore()` **at module scope**. Any test or
  entry point must have an active Pinia before importing a view that imports a
  machine. See the `setActivePinia` dance at the top of
  `tests/transfer-confirm-refusals.spec.js`.
- `customer_utils.refresh()` and `wallet_utils.probe()` de-duplicate in-flight
  requests via a module-level promise. Don't add a second caller path that
  bypasses it.
- `components/AccountVerification/AwsRekognitionLivenessCheck.vue` is **dead
  code** and imports `@tensorflow/tfjs-core` / `@tensorflow/tfjs-backend-webgl`,
  which are *not* in `package.json`. It builds only because nothing imports it.
  Do not wire it up without adding those deps.
- `VITE_DEV_SERVER_HOST` / `VITE_DEV_SERVER_HTTPS` in `.env.example` are read
  by nothing — `vite.config.js` has no `server` block on any branch.
- `.env.example` is missing vars the code actually reads: `VITE_APP_ENV`,
  `VITE_APP_NAME`, `VITE_APP_URL`, `VITE_USER_AGREEMENT_URL`,
  `VITE_PRIVACY_POLICY_URL`, `VITE_THIRD_PARTY_SIGNUP_DECLARATION`,
  `VITE_THIRD_PARTY_TRANSACTION_DECLARATION`,
  `VITE_VOLUME_PAYMENT_MERCHANT_ID`.
- `index.html` hardcodes third-party tags (Google Analytics ID, MS Clarity
  tag, Tawk.to widget, `js.volumepay.io`). These are **per-tenant** and are a
  standard source of merge conflicts.
- **`sdkStepCompleted` still goes nowhere.** All six providers declare it and
  nothing binds it. Harmless today (it is informational), but do not assume an
  emit is wired just because it is declared. `sdkError` *is* now handled -
  `DocumentTypeItem` renders an error with a retry, and the five token-fetching
  providers emit it rather than letting the rejection escape `onMounted`.
- A completed-but-refused review emits `sdkApplicantRejected`, not
  `sdkApplicantStatusChanged`. Keep them apart: the success event refreshes the
  profile and routes the customer onward, and the transfer wizard waits for the
  document to leave `pendingDocuments`, which a rejected one never does.
  Anything that is not explicitly `GREEN` falls to the refusal side, so a new
  vendor answer cannot be mistaken for an approval.
- `src/enums/transaction_state_icon.js` maps `RISK-ASSESSMENT` **twice** (lines
  31 and 33). The later `ShieldCheckIcon` wins; the first is dead.
- `stores/password_policy.js` `setLoaded(flag)` does `flag || true`, so it can
  never set `false`. The spec name claims it "accepts an explicit flag" but only
  ever calls it with none.
- `machines/transaction_navigation_machine.js` uses the **XState v4** entry
  signature `(context, event)` on its two final states. Under v5 actions take a
  single object, so `event` is `undefined` and both `console.error` calls always
  log `undefined`.
- Background images are **not** centralised the way logos now are: five
  hardcoded paths across four auth views, mixed `.webp`/`.png`. A brand that
  ships `login.png` while the view asks for `login.webp` silently renders the
  previous brand's background.
