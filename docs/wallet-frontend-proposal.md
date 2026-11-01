# Customer Wallet — web frontend proposal

Response to the backend handout (API sections 170–172). Covers the **web app** (this
repo): the spend-confirmation path here is the emailed one-time code; mPIN/biometric
apply to the native apps only.

Contents: state model → screens & flows → reuse inventory → new build inventory →
contract questions → market notes → estimate & PR slicing.

---

## 1. Availability & state model

Everything below hangs off one probe. On login (alongside `customerUtils.refresh()`
in `CustomerLayout`), call `GET /wallet/subscription` once and cache the outcome in
a new `wallet` Pinia store as a five-way state. **Single request** (updated per the
backend's round-2 answers — the un-enrolled 404 body now carries a JSON `type` and
`wallet_offered: true|false`, so the licence, the country, and enrolment all read
from one answer):

| probe answer | state | UI consequence |
|---|---|---|
| route 404, no JSON `type` in body | `unavailable` (unlicensed) | wallet does not exist anywhere in the UI |
| 404 + `type` + `wallet_offered: false` | `unavailable` (country not offered / none on file) | same — hidden entirely |
| 404 + `type` + `wallet_offered: true` | `eligible` | nav item + intro/enrol surfaces shown |
| 200, `reacceptance_required: false` | `active` | full feature |
| 200, `reacceptance_required: true` | `paused` | balance/statement visible; every money action routes to re-acceptance first |
| — probe not yet resolved | `unknown` | render nothing wallet-related (no flash of the feature) |

Notes:

- **404-as-absence is a new pattern in this app** (nothing does capability detection
  today; gating is env vars, tenant branches, and customer flags). It composes from
  existing pieces — a per-request axios config flag like the existing
  `skipAuthRedirect` keeps the 404 quiet — and the API already has a documented
  "404 that is not an error" precedent (Check App Version). Nothing is hard-coded
  on: an unlicensed tenant deploys the same build and simply never shows the
  feature.
- `GET /wallet/terms` is the enrolment modal's fetch only — it plays no part in
  availability detection.
- The probe result is cached for the session and re-checked on wallet-page entry;
  balances themselves are **never** cached as truth — `GET /wallet` on every entry
  to the wallet screen, per the handout.
- `Header.vue`'s static `navigation` array becomes a `computed` — the wallet entry
  is the app's first conditional menu item.

## 2. Screens & flows

### 2.1 Wallet home — `/wallet` (new route, nav item)

One route, three faces driven by the state above.

**Eligible (not enrolled) — the intro face.** A hero card in the app's white-card
style: what the wallet is (load once, send many times, refunds land back instantly —
Remitly positions its 2025 wallet the same way: plan transfers, set money aside,
wait for the rate you want), then a primary **"Read terms & activate"** CTA opening
the terms modal (§2.2).

**Active — the main face.** Top to bottom:

1. **Balance card(s)** — `GET /wallet` returns everything the header needs in one
   call: `{wallet_number, reacceptance_required, balances: [{currency, amount,
   amount_formatted}]}` (verified). One card per balances entry, `amount_formatted`
   only. Wallet number displayed under the balance like an account number with the
   house copy-button block (`UseClipboard` idiom from `ClientPaymentAccount.vue`).
   Primary action **Add money**, secondary **Send money** (→ dashboard calculator).
2. **Pending top-ups strip** — open declarations from `GET /wallet/topups`: amount,
   expiry countdown ("expires in 2 days 4 hrs", moment-diff re-rendered on an
   interval — `RecipientCard.vue` idiom), a *View details* re-opening the
   instructions screen, and *Cancel* behind a `DeviceCard.vue`-style confirm dialog.
3. **Recent movements** — first page of `GET /wallet/movements` rendered with the
   Transaction list row pattern; *View all* → statement (§2.4).

**Paused — the re-acceptance face.** Same as active, plus an amber banner pinned
above the balance (the checkout `ExclamationTriangleIcon` alert pattern): "We've
updated the wallet terms — review and accept to keep using your wallet" → terms
modal. Add-money / pay actions open the same modal instead of proceeding. Balance
and statement stay fully visible, per the handout.

### 2.2 Enrolment & terms re-acceptance (one modal, two entry modes)

`GET /wallet/terms` → scrollable terms in a HeadlessUI dialog (the brand-50
note-banner + modal form pattern from `SettingsView`/`StatementRequestModal`).
The `content` is plain text published as-is (confirmed round 2): render with
`white-space: pre-line`, no HTML/markdown parsing — the text is what acceptance
binds to. Acceptance checkbox, then `POST /wallet/subscription` with
`{terms_version_id}` —
the uuid `id` from the terms response, not the human `version` number (verified).
Success (201) carries `{wallet_number, status, enrolled_at, reacceptance_required}`;
celebrate the wallet number ("Your wallet number — W48291736") with copy affordance
and an "Add money" shortcut. The same modal serves re-acceptance (`paused` state
and the `wallet_terms_reacceptance_required` refusal at checkout); only the heading
and CTA copy change. Refusals to handle: 412 `wallet_terms_outdated` (terms changed
while the modal was open — refetch and re-render) and `wallet_already_subscribed`
(treat as success, refresh the store).

### 2.3 Add money (top-up)

Two steps in one modal flow from any "Add money" CTA:

**Step 1 — declare.** Amount input only (existing `MoneyInput`) — **there is no
currency picker**: the API fixes the load currency to the customer's own country's
and takes just `{amount}` (verified; a simpler screen than first sketched). Submit
→ `POST /wallet/topups`.

- `wallet_topup_amount_collides` renders as a **guidance panel, not an error
  wall**: the API's message verbatim in the amber style, plus two inline actions —
  "adjust the amount" (refocus input) and "view pending top-ups" (jump to the
  strip, where cancel lives). No red. (Settled round 2: the status is **412** —
  the handout's 422 was the backend's slip. The message is prose only, no
  structured suggestions field; the panel-with-refocus is the intended treatment.
  We branch on the body's `type` regardless of status.)

**Step 2 — transfer instructions.** `GET /wallet/deposit-instructions`:

- **200** → render with **`ClientPaymentAccount.vue` unchanged** (docs confirm:
  "the same client payment account object transfers already use"), above it two
  copyable fields from the declaration: the **amount** (`ManualPayment` amount
  block — copies the bank-safe unprefixed value) and the **load reference**
  (verified: Declare Load returns `reference`, e.g. `WTA1B2C3D4`, "to carry on the
  bank transfer"). The **Monoova exact-amount warning banner** sits between them:
  "Transfer exactly **{amount_formatted}** and quote reference **{reference}** —
  this is how we match your deposit to your wallet." Expiry shown as both absolute
  time and countdown (`expires_at`, verified).
- **202 provisioning** → "Getting your account ready" wait state: Lottie animation
  + retry every 5s (the `ManualPayment` provisioning idiom) until 200. Verified:
  202 body is `{status: "provisioning"}`.

The declared amount is the matching key (the reference is best-effort corroboration),
so the UI treats the amount as sacred: rendered large, copy-only interaction
encouraged, warning banner adjacent. Reassurance copy straight from the docs' model:
a deposit meant for a transfer always matches the transfer first, and a declaration
that expires moves no money. After step 2 the declaration appears in the pending
strip (`GET /wallet/topups` is a plain newest-first array — no pagination to
handle); cancel refusals answer 412 `wallet_topup_not_open` once a load is no
longer pending (verified) — refresh the strip and show the message.

### 2.4 Statement — `/wallet/statement`

Clone of `Transaction/IndexView.vue`: white card, `ListShimmer`, `ul.divide-y`
rows, numbered `Pagination.vue`, empty-state card. The envelope is the house shape
(updated round 2 — the backend aligned it): `{data, pagination: {total, count,
per_page, current_page, total_pages, links: {self, next, prev}}}`, byte-compatible
with the transaction listing, so `Pagination.vue` drops in unchanged. Rows render
`posted_at` (`niceTime`), the API's plain-language `description` verbatim (they're
written for customers) with `memo` as the secondary line, credits in green with a
`+`, debits neutral (amounts arrive signed — negative = debit). No client-side
arithmetic or re-labelling.

### 2.5 Checkout — the wallet as a payment method

The wallet arrives in `payment_methods[]` and renders as one more `RadioGroup`
card (title-only today). Additions, all inside the existing extension points:

The wallet arrives under **`code: "WALLET"`** (method), and wallet-funded
transactions carry **`payment.payment_provider.code: "WALLET"`** (both confirmed
round 2) — those literals drive the selected-method branch and the `PaymentView`
switch. The method is present for un-enrolled customers too (confirmed: the list
resolves with no enrolment filter, by design; the confirm 412 ladder is the gate),
so the offer-enrolment-from-the-card UX stands.

**On selection** (the `watch(paymentMethod)` hook + the per-method conditional slot
at `Transfer/IndexView.vue:499`): fetch `GET /wallet`, pick the balances entry
whose `currency` matches the quote's payment currency, and show a compact panel
under the card —

- *Sufficient*: "Wallet balance: **{amount_formatted}** · This transfer:
  **{total_amount_currency_prefixed}**" (the docs call that field "the number to
  show on the pay button") with a reassuring check.
- *Short*: balance vs total side by side, shortfall named, two actions: **Add
  money** (opens the §2.3 flow in a modal — checkout state survives) and **choose
  another way to pay** (scrolls back to the methods). This is the client-side
  courtesy check; the server's `insufficient_wallet_balance` refusal drives the
  same panel authoritatively.
- *Not enrolled / paused* (when the probe already knows): the panel offers
  enrolment / re-acceptance up front instead of letting Continue fail.

**Button microcopy**: with the wallet selected, Continue becomes **"Pay with
Wallet"** (Baymard: the primary button should say what happens next when a
non-card method is chosen).

**On Continue** — the confirm call's 412 ladder extends the existing `type` switch
(`Transfer/IndexView.vue:128`), in the API's stated order:

| type | handling |
|---|---|
| `wallet_subscription_required` | open enrolment modal; on success, resubmit |
| `wallet_terms_reacceptance_required` | open re-acceptance modal; on success, resubmit |
| `insufficient_wallet_balance` | show the balance-vs-total panel (server truth) |
| `wallet_authorization_required` | request `POST /wallet/spend-otp`, open the **spend-confirmation modal** |
| `wallet_authorization_invalid` | inline error in that modal; retry within its 5 attempts |

**Spend-confirmation modal** — clone of `Customer/EmailVerification.vue` (the
embeddable, emit-based OTP variant): 6-digit `v-otp-input`, auto-submit on
completion resubmits the confirm call with **`wallet_otp` as a top-level body
param** (confirmed round 2 — never inside `payment_data`; devices likewise send
`wallet_pin` + `wallet_pin_token` or `wallet_biometric_token` top-level), resend
link behind the house 30s `p-timeout` cooldown, "valid 10 minutes / check spam"
copy. Verified: `POST /wallet/spend-otp` takes `{quote_id}`, answers
`{status: "sent"}`, and the code is bound to that quote, dies on use, after ten
minutes, and after five wrong guesses — the modal copy reflects exactly that. We
do not pre-request the code on selection — the 412 ladder is the contract, and
earlier refusals (balance, terms) shouldn't cost the customer an email.

**After confirmation** the response is a normal transaction. A thin
`Payment/Wallet.vue` (cloned from the provider-component skeleton, minus redirect
and bank details) shows the processing Lottie and lets the existing Echo channel
`client-payment.{id}` drive it to completed (auto-redirect) or failed (existing
retry affordance) — a failed wallet payment is just a failed payment.

### 2.6 Settings & dashboard

- **Settings card** in the `SettingsView` grid (`v-if` on availability): enrolment
  status line, wallet number with copy, link to `/wallet`, and — enrolled only —
  **Close wallet** behind the destructive-confirm dialog; the zero-balance rule is
  explained in the dialog (refusal: 412 `wallet_balance_must_be_zero`, message
  rendered inline), along with the verified permanence detail: the wallet number is
  retired and never reissued — re-enrolling later mints a new one.
- **Dashboard**: a slim balance card above the calculator in the right column
  (the payvel budget-card slot), showing formatted balance + "Add money", gated on
  `active`/`paused`. Cheap, and it makes the wallet feel lived-in.

## 3. Reuse inventory (existing → wallet use)

| Existing asset | Where it serves the wallet |
|---|---|
| `ClientPaymentAccount.vue` | deposit-instructions rendering, **unchanged** |
| `ManualPayment.vue` structure | instructions-screen wrapper: instruction → details → copyable amount |
| Monoova exact-amount banner | "transfer exactly this amount" warning |
| `ManualPayment` 5s-poll + Echo idiom | 202-provisioning wait |
| `Customer/EmailVerification.vue` + `vue3-otp-input` + `p-timeout` cooldown | spend-confirmation modal |
| 412 `type` switch (`Transfer/IndexView.vue:128`) | the five wallet refusal types |
| Per-method conditional slot + `watch(paymentMethod)` + `canContinue` | selected-wallet balance panel & gating |
| `RadioGroup` method cards | wallet as a method, no parsing changes |
| Provider-component skeleton + `client-payment.{id}` Echo + state Lotties | `Payment/Wallet.vue` post-confirm screen |
| `Transaction/IndexView.vue` + `ListItem` + `Pagination.vue` + empty-state card | statement |
| `StatementRequestModal.vue` | modal-form template incl. 412/422 mapping |
| `DeviceCard.vue` confirm dialog | cancel top-up, close wallet |
| Settings card grid + `DeviceView.vue` satellite-page template | settings surface |
| `UseClipboard` copy block | wallet number, amounts, account fields |
| `RecipientCard` interval-refresh + moment | 72h expiry countdown |
| notiwind group `customer` | success toasts (enrolled, top-up declared, cancelled) |
| Store/composable/model conventions (`customer` store, `use<X>Utils`, `getInstance` models) | wallet plumbing shape |

## 4. New build inventory

Plumbing: `stores/wallet.js` (availability + subscription + balances),
`composables/wallet_utils.js` (~10 wrappers under `/client/v1/wallet…`),
`models/wallet_{subscription,balance,movement,topup}.js`, optional
`enums/wallet_refusal_type.js`.

Views: `Wallet/IndexView.vue`, `Wallet/StatementView.vue`.

Components: `Wallet/BalanceCard.vue`, `Wallet/TermsModal.vue`,
`Wallet/TopUpFlow.vue`, `Wallet/PendingTopUps.vue`, `Wallet/MovementListItem.vue`,
`Wallet/SpendOtpModal.vue`, `Wallet/CheckoutPanel.vue`, `Payment/Wallet.vue`.

Edits: `Header.vue` (computed nav), `SettingsView.vue` (card),
`Transfer/IndexView.vue` (412 branches, panel, microcopy),
`Transfer/PaymentView.vue` (+1 provider `v-if`), `DashboardView.vue` (card),
`router/index.js` (+2 lazy routes). The XState machine is untouched — wallet
refusals resolve in modals on the confirm step, matching their "fix and resubmit"
character (machine states are for step-changing detours like address/KYC).

## 5. Contract record — all questions resolved

Two rounds: the API docs review resolved probe mechanics, the movements shape,
the spend-OTP contract (quote-bound, single-use, 10 min, 5 guesses), the
declare-load contract (amount-only, reference returned), and the full 412 type
inventory. The backend's round-2 answers settled the rest — and improved the
contract twice (both now in the codebase, docs render on next deploy; **build
against these, not the docs snapshot**):

| item | answer |
|---|---|
| Availability probe | one leg: the un-enrolled subscription 404 body carries `type` + `wallet_offered: true\|false` (§1); a route 404 with no JSON `type` means unlicensed |
| Movements envelope | house `{data, pagination}` shape, byte-compatible with the transaction listing — `Pagination.vue` unchanged (§2.4) |
| Wallet codes | method `code` and payment provider `code` are both the literal `WALLET` |
| Credential placement | top-level body params on Confirm Quote — `wallet_otp`, or `wallet_pin` + `wallet_pin_token`, or `wallet_biometric_token`; never inside `payment_data`; nullable, read only for stored-value funding |
| Collision status | **412** `wallet_topup_amount_collides` (handout's 422 was in error); prose message only, no structured suggestions |
| Wallet for un-enrolled customers | present in `payment_methods[]` (no enrolment filter, by design); the confirm 412 ladder gates |
| Websocket event | ticketed **SD-909**: broadcast on `client-customer.{id}` after every balance-changing posting (load received, spend settled, refund, operator return); names currency and movement kind, carries no balance figure — the client refetches. Build fetch-on-entry now; the listener is a pure addition later |
| Terms format | plain text as published; render with `white-space: pre-line` |

Known v1 boundaries we'll design around (market context, not requests): no split
funding (balance + card top-off — PayPal's backup-funding behaviour is the market
norm and its silent-skip failure mode is exactly what our explicit
insufficient-balance panel avoids), no auto top-up, no self-service withdrawal.

## 6. Market notes that shaped the above

- **Remitly Wallet (Sept 2025)** — closest comparator (remittance + stored value):
  positioned around *planning* transfers and waiting out rates, not banking; free
  to load; balance is a launchpad for sends. Our intro face borrows that framing.
- **Wise add-money** — bank-transfer top-up to own account details; their help
  warns that name/amount mismatches derail matching in several corridors — the
  exact-amount banner treats the declared amount as the contract.
- **PayPal balance** — no split payments; when balance is short it silently skips
  to a backup source, a documented user complaint. We make the moment explicit:
  balance vs total, then top-up or switch.
- **Baymard payment-selection research** — radio-card lists are fine (we have
  one); the win is updating the primary button's microcopy per selected method;
  keep other methods visible as fallback.
- **Fintech statement patterns** — plain-language lines, pending items with clear
  next steps and expiry, support reachable from stuck states.

Sources: [Remitly Wallet](https://www.remitly.com/us/en/home/wallet) ·
[Remitly Help — What is Remitly Wallet](https://www.remitly.com/us/en/help/article/what-is-remitly-wallet) ·
[Wise — add money](https://wise.com/help/articles/2596978/how-do-i-add-money-to-my-account) ·
[Baymard — payment method selection](https://baymard.com/blog/payment-method-selection) ·
[PayPal balance terms](https://www.paypal.com/us/legalhub/paypal/pp-balance-tnc) ·
[UXDA banking UX practices](https://theuxda.com/blog/top-20-financial-ux-dos-and-donts-to-boost-customer-experience)

## 7. Estimate & suggested slicing

~**12–15 dev-days** (≈3 calendar weeks with review/QA) for one developer who knows
this codebase, assuming contract questions 1–4 answered before the checkout slice.

| PR | Scope | Days |
|---|---|---|
| 1 | Plumbing: store, composable, models, availability probe, nav + settings gating | 1.5 |
| 2 | Enrolment (terms modal, both modes) + wallet home (3 faces) + statement | 3.5–4.5 |
| 3 | Top-up flow: declare, collision guidance, instructions, provisioning wait, expiry, cancel | 2–2.5 |
| 4 | Checkout: method panel, 412 ladder, spend-OTP modal, microcopy, `Payment/Wallet.vue` | 3–4 |
| 5 | Dashboard card, paused-state sweep, empty states, QA hardening | 2–2.5 |

Each PR ships dark on unlicensed tenants by construction (the probe), so merging
to main is safe throughout — no tenant-branch divergence needed.

Verified against the console API documentation (Wallet Enrolment, Wallet, Wallet
Spending, Checkout & Confirmation, Error Handling groups) and the backend's
round-2 answers, both 2026-08-31. §5 records the final contract, including two
round-2 improvements not yet rendered in the docs snapshot (one-leg probe body,
house movements envelope). All five build slices are unblocked; SD-909 tracks the
websocket nice-to-have.
