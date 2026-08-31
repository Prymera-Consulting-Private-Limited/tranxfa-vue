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
a new `wallet` Pinia store as a five-way state:

| state | source | UI consequence |
|---|---|---|
| `unavailable` | 404 (no licence) or country not offered | wallet does not exist anywhere in the UI |
| `eligible` | endpoint answers, not enrolled | nav item + intro/enrol surfaces shown |
| `active` | enrolled, terms current | full feature |
| `paused` | enrolled, new mandatory terms pending | balance/statement visible; every money action routes to re-acceptance first |
| `unknown` | probe not yet resolved | render nothing wallet-related (no flash of the feature) |

Notes:

- **404-as-absence is a new pattern in this app** (nothing does capability detection
  today; gating is env vars, tenant branches, and customer flags). It composes from
  existing pieces — a per-request axios config flag like the existing
  `skipAuthRedirect` keeps the 404 quiet. Nothing is hard-coded on: an unlicensed
  tenant deploys the same build and simply never shows the feature.
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

1. **Balance card(s)** — one per currency from `GET /wallet`, `*_formatted` values
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
note-banner + modal form pattern from `SettingsView`/`StatementRequestModal`),
acceptance checkbox, then `POST /wallet/subscription` with the version shown.
Success state celebrates the wallet number ("Your wallet number — W12345678") with
copy affordance and an "Add money" shortcut. The same modal serves re-acceptance
(`paused` state and the `wallet_terms_reacceptance_required` refusal at checkout);
only the heading and CTA copy change.

### 2.3 Add money (top-up)

Two steps in one modal flow from any "Add money" CTA:

**Step 1 — declare.** Amount input (existing `MoneyInput`) + currency (from wallet
balances). Submit → `POST /wallet/topups`.

- `422 wallet_topup_amount_collides` renders as a **guidance panel, not an error
  wall**: the API's message verbatim in the amber style, plus two inline actions —
  "adjust the amount" (refocus input) and "view pending top-ups" (jump to the
  strip, where cancel lives). No red.

**Step 2 — transfer instructions.** `GET /wallet/deposit-instructions`:

- **200** → render with **`ClientPaymentAccount.vue` unchanged** (the API returns
  the identical `{attributes, payment_reference}` shape — confirmed against the
  component's contract), above it the declared amount in a copyable field
  (`ManualPayment` amount block — copies the bank-safe unprefixed value), and the
  **Monoova exact-amount warning banner**: "Transfer exactly **{amount}** — this is
  how we match your deposit to your wallet." Expiry shown as both absolute time and
  countdown.
- **202 provisioning** → "Getting your account ready" wait state: Lottie animation
  + retry every 5s (the `ManualPayment` provisioning idiom) until 200.

The declared amount is the matching key, so the UI treats it as sacred: rendered
large, copy-only interaction encouraged, warning banner adjacent. After step 2 the
declaration appears in the pending strip with its expiry; expiry or wrong-amount
outcomes surface as movements/support states, not client-side logic.

### 2.4 Statement — `/wallet/statement`

Clone of `Transaction/IndexView.vue`: white card, `ListShimmer`, `ul.divide-y`
rows, numbered `Pagination.vue`, empty-state card. Rows render the API's
plain-language `description` verbatim (they're written for customers), credits in
green with a `+`, debits neutral, `niceTime` dates. No client-side arithmetic or
re-labelling.

### 2.5 Checkout — the wallet as a payment method

The wallet arrives in `payment_methods[]` and renders as one more `RadioGroup`
card (title-only today). Additions, all inside the existing extension points:

**On selection** (the `watch(paymentMethod)` hook + the per-method conditional slot
at `Transfer/IndexView.vue:499`): fetch `GET /wallet`, show a compact panel under
the card —

- *Sufficient*: "Wallet balance: **{balance}** · This transfer: **{total}**" with a
  reassuring check.
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
completion resubmits the confirm call with `wallet_otp`, resend link behind the
house 30s `p-timeout` cooldown, "valid 10 minutes / check spam" copy. We do not
pre-request the code on selection — the 412 ladder is the contract, and earlier
refusals (balance, terms) shouldn't cost the customer an email.

**After confirmation** the response is a normal transaction. A thin
`Payment/Wallet.vue` (cloned from the provider-component skeleton, minus redirect
and bank details) shows the processing Lottie and lets the existing Echo channel
`client-payment.{id}` drive it to completed (auto-redirect) or failed (existing
retry affordance) — a failed wallet payment is just a failed payment.

### 2.6 Settings & dashboard

- **Settings card** in the `SettingsView` grid (`v-if` on availability): enrolment
  status line, wallet number with copy, link to `/wallet`, and — enrolled only —
  **Close wallet** behind the destructive-confirm dialog; the zero-balance rule is
  explained in the dialog, and a refusal renders the API message inline.
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

## 5. Contract questions for the backend

Blocking-ish (answers shape the build):

1. **Wallet payment provider `code`** — what does `payment.payment_provider.code`
   carry on a wallet-funded transaction? Needed for the `PaymentView` switch.
2. **Movements pagination envelope** — please confirm `GET /wallet/movements`
   returns the house `{data: [...], pagination: {total_pages, current_page,
   links: {prev, next}}}` shape so `Pagination.vue` drops in unchanged.
3. **Probe semantics** — for a customer in a non-offered country, what does
   `GET /wallet/subscription` return (vs. the unlicensed 404)? We want the probe
   alone to decide *hide entirely* vs *offer enrolment* without also calling
   `GET /wallet/terms`.
4. **Wallet in `payment_methods[]` for un-enrolled customers** — is it included
   (so checkout can offer enrolment) or absent until enrolled? Either works; the
   UI differs.

Nice-to-have (raise now, cheap while the paint is wet):

5. **A wallet event on the websocket.** The app is Echo-driven everywhere
   (payments, transactions, KYC all push). A broadcast on the existing
   `client-customer.{id}` channel when a top-up settles / balance changes would
   give the "money arrived" moment live on the instructions screen and wallet
   home. Without it we fall back to fetch-on-entry only.
6. **Structured collision hints** — does the `wallet_topup_amount_collides` body
   carry suggested alternative amounts, or prose only? Structured suggestions
   would render as one-tap options.
7. **Balance on the quote** — optionally include the wallet's spendable balance
   (payment currency) on the quote's wallet method entry, saving the extra
   `GET /wallet` at checkout and guaranteeing the courtesy check uses the same
   figure the server will.
8. **Terms format** — HTML, markdown, or plain text? Affects the modal renderer.

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

Verification pending: endpoint shapes above follow the handout; request/response
details to be checked against console API docs sections 170–172 when the link
lands.
