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
   (`Pagination.vue` unchanged); renders `description` and `memo` verbatim;
   credit/debit styling from the amount's sign only.

## QA checklist (needs a wallet-licensed environment + test customer)

- [ ] Unlicensed tenant: no Wallet nav/settings/dashboard trace; `/wallet` URL redirects to dashboard.
- [ ] Eligible country: intro face → terms → enrol → wallet number shown and copyable.
- [ ] Non-offered country: wallet hidden even though other endpoints work.
- [ ] Top-up declare → instructions (fresh account: provisioning face first) → pending strip with expiry countdown → cancel (and cancel of an already-received load surfaces the API message gracefully).
- [ ] Colliding amount: amber guidance, no error wall; nudged amount succeeds.
- [ ] Checkout: wallet selected → balance vs total panel; short balance → server message + Add money (checkout state survives the modal); sufficient → "Pay with Wallet" → emailed code → confirm → processing → success screen → transaction view.
- [ ] Wrong/expired code: message shown, inputs cleared, 5-attempt ladder respected; resend works after the 30s cooldown.
- [ ] Publish new mandatory terms: paused banner on home, money actions gate to re-acceptance, checkout panel prompts; accepting restores everything.
- [ ] Close wallet: refused with balance (message inline); succeeds at zero; nav/settings flip to eligible state.
- [ ] Refund of a wallet-funded transfer: movement appears, balance rises (fetch on entry).

## Follow-ups (not in this branch)

- **SD-909** — when the balance-change broadcast lands on
  `client-customer.{id}`, add a listener in `CustomerLayout.vue` beside the
  existing document events that calls `walletUtils.getWallet()` and refreshes
  movements/top-ups on the wallet views. The store refetches; no balance figure
  is read from the event.
- Native apps (PIN/biometric confirmation) are out of scope for this repo; the
  confirm call already carries the credential params server-side.
- No split funding / auto top-up / self-service withdrawal in v1, per contract.
