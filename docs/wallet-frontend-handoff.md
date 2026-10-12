# Customer Wallet — web frontend handoff

Built on branch `feature/customer-wallet` (commits `d6cd9c4`, `cc44e39`, `d823dbc`),
implementing [wallet-frontend-proposal.md](wallet-frontend-proposal.md) against the
round-2 contract. Production build verified; end-to-end testing against a
wallet-licensed deployment is the open item.

## What shipped

| Surface | Where |
|---|---|
| Availability probe + store | `src/composables/wallet_utils.js` (`probe()`), `src/stores/wallet.js` |
| Wallet home (intro / active / paused faces) | `src/views/Wallet/IndexView.vue` |
| Enrolment & terms re-acceptance modal | `src/components/Wallet/TermsModal.vue` |
| Top-up flow (declare → instructions, provisioning wait, collision guidance) | `src/components/Wallet/TopUpFlow.vue` |
| Pending top-ups strip with expiry + cancel | `src/components/Wallet/PendingTopUps.vue` |
| Statement (paginated) | `src/views/Wallet/StatementView.vue` |
| Checkout integration (panel, 412 ladder, spend-OTP modal, button microcopy) | `src/views/Transfer/IndexView.vue`, `src/components/Wallet/SpendOtpModal.vue` |
| Post-confirm payment screen | `src/components/Payment/Wallet.vue` (+1 line in `PaymentView.vue`) |
| Nav gating, settings card + close flow, dashboard balance card | `Header.vue`, `SettingsView.vue`, `src/components/Wallet/DashboardCard.vue` |

Models: `wallet`, `wallet_balance`, `wallet_subscription`, `wallet_terms`,
`wallet_movement`, `wallet_topup`. Enums: `wallet_availability`,
`wallet_refusal_type`.

## Contract points as implemented (backend, please sanity-check)

1. **Probe** — `GET /client/v1/wallet/subscription`: 200 → active/paused from
   `reacceptance_required`; 404 with `type` + `wallet_offered: true` → eligible;
   any other 404 (including no JSON `type`) → feature hidden entirely. Errors
   other than 404 leave the wallet hidden (fail-closed). Runs once per session
   from `CustomerLayout`, deduped.
2. **Enrolment** — `POST /wallet/subscription {terms_version_id}`;
   `wallet_terms_outdated` refetches and re-renders the modal;
   `wallet_already_subscribed` is treated as success.
3. **Top-ups** — `POST /wallet/topups {amount}` (no currency);
   `wallet_topup_amount_collides` handled by body `type` on **either** 412 or 422;
   deposit instructions poll every 5s while **202 provisioning**; the declared
   `amount` (raw) is the copy source, `amount_formatted` the display;
   the returned `reference` is injected into the account component's reference
   slot when the deposit account carries none of its own.
4. **Checkout** — wallet method recognised by `code === 'WALLET'`; confirm sends
   `wallet_otp` as a top-level body param (null otherwise); the five 412 types are
   handled in the proposal's order; `insufficient_wallet_balance` refetches
   `GET /wallet` and shows the server message with Add-money / switch-method
   paths; `wallet_authorization_required` triggers `POST /wallet/spend-otp
   {quote_id}` and the code modal; `wallet_authorization_invalid` clears the
   inputs and shows the message. Post-confirm, the payment screen expects
   `payment.payment_provider.code === 'WALLET'` and listens on
   `client-payment.{id}` as every provider does.
5. **Statement** — expects the house `{data, pagination}` envelope
   (`Pagination.vue` unchanged); renders `description` verbatim as the row's
   label (`memo` is no longer read — removed by SD-924); icon and bubble colour
   switch on `kind` (`load`/`refund` inflow-green, `spend`/`return`
   outflow-grey, `adjustment` and any unknown kind fall back to the amount's
   sign); the amount's own colour still follows its sign.

## Verified in the backend-driven e2e (2026-09-01)

The full happy path was driven through this build against the local platform:
enrolment → deposit-account provisioning (202 face, ~20s) → declared load →
bank arrival → balance on the books → wallet-funded transfer through checkout
(method card, balance panel, "Pay with Wallet", 412 ladder requesting and
collecting the emailed code, auto-submit resubmitting with `wallet_otp`) →
settlement → statement (signed amounts, verbatim descriptions, house
pagination). Availability gating and the dashboard balance card tracked the
licence and live balance correctly; the unlicensed face (feature hidden,
`/wallet` redirects) was verified separately before the licence was issued.

Facts QA should know:

- **Testing accounts always receive the spend code `000000`** — accounts
  flagged `is_testing_account` get a fixed code by platform convention (same
  rule as the PIN system). Six zeroes in a test run is correct; in production
  it's an incident.
- **The spend-code email's language and branding follow deployment config**
  (customer-communication locale and company identity), not the customer's UI
  language.
- **After a wallet spend the payment rests at Authorized** and the transfer
  proceeds through the normal pipeline — nothing special on transaction views.
- **First-time deposit provisioning took ~20s** before 202 became 200 — the 5s
  retry with the patient wait state is the intended treatment.
- **The money-arrival moment cannot be faked locally** by posting a bank
  webhook (signature verification refuses it silently, by design). Ask the
  backend team for the below-the-gate driver script, or use a real small
  deposit on staging.

## Verified by frontend-driven browser test (2026-09-01)

- **Wrong spend code**: sixth digit auto-submits; the confirm's 412
  `wallet_authorization_invalid` message renders verbatim in the modal; inputs
  clear for retry; the correct code then succeeds and the payment screen
  auto-redirects to the transaction view after ~4s — including the
  mount-already-settled case the redirect fix targets. The resend cooldown
  counts down correctly on every modal opening (fixed this run: the countdown
  interval leaked across open/close cycles and showed the resend link early).
- **Insufficient balance**: the confirm refuses with
  `insufficient_wallet_balance` *before* any spend code is requested (verified:
  no `/wallet/spend-otp` call, no wasted email); the server's message renders
  in the amber guidance panel with both recovery paths; "Add money" opens the
  top-up flow over checkout and closing it leaves purpose, method, declaration,
  and the guidance intact; the panel's balance figure refetches after the
  refusal.

## Remaining for QA (designed and built, not yet driven)

- [ ] Colliding top-up amount: amber guidance, no error wall; nudged amount succeeds.
- [ ] Expired spend code and the 5-attempt lockout end of the ladder (wrong-code handling verified above).
- [ ] Paused on new mandatory terms: banner on home, money actions gate to re-acceptance, checkout panel prompts; accepting restores everything.
- [ ] Cancel of a pending load — and of an already-received one (API message surfaces gracefully).
- [ ] Close wallet: refused with balance (message inline); succeeds at zero; nav/settings flip to eligible.
- [ ] Refund of a wallet-funded transfer: movement appears, balance rises (live via `WalletBalanceChanged`, or on entry).
- [ ] Non-offered country: wallet hidden even though other endpoints work.

## Statement copy and `kind` (SD-924 — shipped)

The movements response now carries customer-facing, server-localised
`description`, a stable `kind` (`load`/`spend`/`refund`/`return`/`adjustment` —
enum `wallet_movement_kind.js`), and no `memo`. As implemented:

- `memo` is gone from the model and the row; the row shows `description` with
  the time underneath, rendered exactly as the server sends it (no client-side
  mapping of the strings — they're localised).
- The row's icon and colour switch on `kind`, never on `description`:
  down-left arrow for `load`, u-turn-left for `refund` (inflow, green);
  up-right for `spend`, u-turn-right for `return` (outflow, grey);
  up-down arrows for `adjustment` with colour from the amount's sign, which is
  also the fallback for any future kind the client doesn't know.
- The statement now refreshes live: `WalletBalanceChanged` → `CustomerLayout`
  refetches the wallet → the open statement silently refetches its current
  page, so the new row appears without a shimmer or losing the reader's place
  (same trigger the wallet home already uses).

## Live balance updates (SD-909 — shipped)

`CustomerLayout.vue` listens for **`WalletBalanceChanged`** (`{currency, kind}`,
kind ∈ load/spend/refund/return/adjustment) on the customer channel beside the
existing document events, and refetches `GET /wallet` — the event carries no
balance figure and none is read from it; the books stay the only truth. The
wallet home watches the store and refreshes its movements and pending-loads
lists when the balance object is replaced, so a load arriving while the customer
looks at the instructions shows up live.

Payment success auto-redirects to the transaction view after 4 seconds (the ✕
still exits immediately) — including when settlement completed before the
payment screen subscribed, which is the common wallet case.

## Follow-ups (not in this branch)

- Native apps (PIN/biometric confirmation) are out of scope for this repo; the
  confirm call already carries the credential params server-side.
- No split funding / auto top-up / self-service withdrawal in v1, per contract.
