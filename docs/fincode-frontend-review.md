# Fincode × customer app — frontend review

A read of the customer app against the Fincode background handout: where the
partner's model (register first, pay later; hosted Open Banking redirect;
partner-side compliance; 12-hour window; queued-as-normal) breaks the
assumptions the app is built on. **Review only — nothing here is built.** Each
section ends with a rough sketch of what a fix involves, as scoping input, not
commitment.

Method: three parallel read-only sweeps (the confirm→pay pipeline; transaction
state presentation; the Fincode footprint on both repos and the client API
contract in `console.remitso`), with the highest-impact claims verified by
direct reads. Every claim carries a `file:line` you can walk.

**Tenant note:** `main...selamsend_staging` differs only in branding (logos,
CSS, Tawk.to — 14 files, no payment or transfer file touched). Fincode work on
`main` reaches SelamSend unchanged; there is no tenant-specific payment
behaviour to reconcile.

**The single most important fact:** the app has no Fincode-specific code.
`src/components/Payment/Fincode.vue` is a byte-for-byte copy of `PayCross.vue`
(commit `587ac26`); only the filename and the `'FINCODE'` case in
`PaymentView.vue:116` distinguish it. Every behaviour below is the generic
redirect-provider treatment meeting a partner it wasn't designed for. And of
the six behaviours in your handout, **five are invisible to the client API
today** — the app couldn't render them even if it tried (details in §7).

---

## 1. The gap between confirming and paying

**Today.** The app assumes a confirmed transfer is instantly payable:

- Confirm success routes straight to the payment screen — no interstitial
  (`src/views/Transfer/IndexView.vue:139-143`).
- `PaymentView.vue:34-40` does exactly one `GET /transaction/{id}` — no
  `.catch`, no retry, no poll. If the fetch fails the modal opens blank.
- The wizard's XState machine has no state for "confirmed, not yet payable" —
  its `confirmed` state is an unused final state
  (`src/machines/transaction_navigation_machine.js:166-201`).

**Accidental mitigation.** Because `Fincode.vue` is a redirect-provider copy,
it already polls every 10s while the payment is `CREATED`/`INITIALIZED` and
shows a waiting face (`Fincode.vue:58-60, 112-116`). So the registration gap
doesn't strand the customer — but the copy is wrong for what's actually
happening ("Please wait while we are setting up the payment." while Fincode
runs compliance can last minutes), there's no timeout, and no explanation that
this wait is normal.

**Two real defects in the gap:**

- **Dead Pay button.** The `PENDING` branch renders
  `<a :href="transaction.payment.paymentUrl">` with no null guard
  (`Fincode.vue:107`). A payment that reaches `PENDING` before `payment_url`
  lands (or an Echo event with a null URL) gives the customer a live-looking
  green "Pay" button that does nothing.
- **Retry degrades state.** `POST /transaction/payment/{id}` never eager-loads
  `paymentData` (`console.remitso TransactionsController.php:532`), so the
  retry response always carries `payment_url: null`; the app swaps in that
  degraded object (`PaymentView.vue:58`) and waits on the websocket to
  repopulate it.

**Fix sketch.** Mostly frontend: a Fincode-specific waiting face with honest
copy ("we're registering your transfer with our delivery partner — usually
under a minute"), a null-URL guard on the Pay button, and keeping the poll
alive until the URL exists rather than until the state is `PENDING`. The wallet
top-up flow's 202-provisioning loop (`src/components/Wallet/TopUpFlow.vue:83`)
is the in-house precedent for treating "provisioning" as a first-class state.

## 2. How a partner-blocked transfer is presented

**Today: it isn't.** Three layers of nothing:

- **No reason field exists on any transaction model** — no `stopReason`,
  `holdReason`, or `requiredAction` anywhere in `src/models/`. A stopped
  transfer renders one generic banner whose entire content is the server's
  `state.description` string (`src/views/Transaction/ItemView.vue:138-158`).
  No CTA, no "what to do next", no contact-support prompt.
- **The actionable reason never leaves the backend.** The compliance block
  writes exactly what you'd want shown — "Partner onboarding incomplete;
  outstanding: VERIFY_ACCOUNT_VIA_EKYC, ADDRESS_PROOF" — to
  `payout.failure_reason` (`console.remitso ProcessPayout.php:659-669`), and
  no client resource serializes it. The payout's `state` is exposed
  (`PayoutTransactionResource`) but the app renders payout state nowhere.
- **At confirm time, unmapped refusals freeze the wizard.** The confirm catch
  (`src/views/Transfer/IndexView.vue:144-188`) handles a fixed list of 412
  `type`s and 422; only `duplicate_transaction` and
  `active_transfer_disable_rule` produce a visible message. A 412 with any new
  `type` falls through every branch (there is no final `else`), any other
  status is ignored, and a network error throws inside the catch (unguarded
  `error.response.status`). All three leave the customer staring at a
  permanently spinning "Saving..." button with no message at all. **If a
  Fincode-originated refusal ever surfaces through confirm as a new type,
  today's UI response is a frozen spinner.**

**Fix sketch.** Needs contract first: a customer-facing reason (and ideally a
machine `type` per outstanding item) on the transaction or payout resource —
raw `failure_reason` with internal codes like `VERIFY_ACCOUNT_VIA_EKYC` is not
customer copy. Frontend then: a default `else` in the confirm catch (show the
server message, stop the spinner — cheap and worth doing regardless of
Fincode), and a real "action needed" face on the transaction view when the
partner names what's outstanding.

## 3. The redirect out, and the return

**Going out.** The Pay button is a bare same-tab anchor (`Fincode.vue:107`):
the SPA dies on navigation (the Echo subscription and poll die with it), no
local state transition happens on click, and the backend is never told the
customer left. `Apaylo.vue:92-94,126` is the house's own better pattern —
`target="_blank"`, a click handler that flips local state to `REDIRECTED` so
the remaining tab shows the waiting face, and an explicit "I've made payment"
button.

**Coming back — the highest-risk surface for Open Banking.**
`src/views/Transfer/PaymentCallbackView.vue`:

- Reads **zero query parameters** — nothing in `src` reads `route.query`, so
  whatever Fincode appends to the return URL is discarded. Fine if the return
  URL stays backend-owned; worth stating as a contract assumption.
- One fetch with no `.catch` (a failed fetch null-crashes the view:
  `PaymentCallbackView.vue:40,61,73`), then **websocket-only**: no polling, no
  timeout, no exit. Your handout says the state at return is by design not
  final — if the `PaymentTransactionStateUpdated` event is missed (dropped
  connection, mobile browser resumed from background), the customer sits on
  "Awaiting Payment Update" with a looping animation forever
  (`PaymentCallbackView.vue:118-122`). The listener also never updates
  `payment_url`, and the success path can double-fire `router.push`
  (`:31-35` and `:52-56`).
- The generic "processing" face renders
  `clientPaymentAccount?.waitTimeMessage` (`Fincode.vue:121`) — a field only
  account-transfer providers populate — so Fincode customers get a heading
  over a blank line.

**No way back in.** Nothing links to `/pay/:transactionId` from any list or
detail view; the transaction page's payment modal re-mounts only
`MANUAL-PAYMENT` / `PAGA` / `MONOOVA` (`ItemView.vue:324-326`); and after 3
retry attempts `PaymentView.vue:70-74` ejects the customer to the transaction
view permanently. **A customer who closes the modal on a Fincode transfer with
11 hours of payable window left has no in-app route back to paying it.** Under
a 30-minute window that barely mattered; under 12 hours it's a first-class
journey.

**Fix sketch.** Frontend: a polling floor on the callback view (the payment
components already poll — the callback view is the one place that doesn't), a
`.catch` + error face, Apaylo-style redirect etiquette for Fincode, and a
"Complete payment" entry point on the transaction view for a payment still in
its window. That last one is the only structural piece.

## 4. The partner's terms text

**Received, stored, dropped — confirmed.** The backend keeps
`paymentTermsNConditions` in the payment-data JSON blob
(`console.remitso Fincode.php:291`, `InitializePaymentTransaction.php:191-203`)
and never serializes it: `PaymentTransactionResource` promotes only
`payment_url`. On the app side there is no payment-terms concept at all (every
`terms` reference in `src` is wallet terms), and no payment component renders
provider-authored text — all copy is hardcoded per component.

**Fix sketch.** Contract: expose the terms text on the payment resource (and
on the websocket event if it can arrive late). Frontend: render it in the
`PENDING` branch beside the Pay button — the wallet terms modal's
`white-space: pre-line` treatment is the in-house pattern for
server-authored plain text.

## 5. The 12-hour window vs. the app's sense of time

**The window is real but invisible.** `config/payment-expiry.php:58-65` holds
the 12 hours (other providers default to 2 days) — and **no client response
carries any expiry field**: not the quote, not the transaction, not the
payment. `expires_at` exists in the app only for wallet top-ups. So the app
currently has no countdown to correct — it has nothing.

**What exists is worse than nothing at the edges:**

- When the sweep cancels an unpaid payment, the resulting states —
  `TIMED_OUT`, `CANCELLED`, `REFUNDED`, `PART_REFUNDED`, all declared in
  `src/enums/payment_state.js:9-12` — are handled by **no** status computed in
  the codebase. The payment modal and the callback view both render **blank**
  for them. A Fincode payment expiring at hour 12 ends in an empty white
  dialog.
- Copy that contradicts the model: the calculator promises "Blazing Fast,
  Instant Transfers" (`Calculator.vue:440`) on the same screens that would
  host a 12-hour-window transfer; other providers hardcode their own urgency
  ("30–60 minutes" `Monoova.vue:127`, "up to 5 minutes" `Apaylo.vue:140`).
- Two fields that would anchor honest timing copy are already on the wire and
  rendered nowhere: `Quote.exchangeRateDate` (rate-fixed-at moment,
  `src/models/quote.js:26,60`) and `TransactionState.progress`
  (`src/models/transaction_state.js:25`).

**Fix sketch.** Contract: an `expires_at` on the payment (or transaction).
Frontend: the wallet pending-top-ups strip already implements the right calm
pattern — a 30s tick re-rendering `moment(expiresAt).fromNow()`
(`src/components/Wallet/PendingTopUps.vue:28-47`) — plus terminal-state faces
for `TIMED_OUT`/`CANCELLED` (worth doing for every provider, not just
Fincode).

## 6. Is "queued" treated as normal?

**Mostly yes, by architecture — with three exceptions.**

The good news: transfer-state presentation is fully server-authored. The state
object carries `label`, `description`, and `color_scheme`
(`src/models/transaction_state.js`), and both the list chip
(`components/Transaction/ListItem.vue:43-56`) and the detail banner
(`ItemView.vue:138-158`) take their colour from it. A calm blue
"waiting for your money" state is therefore **mostly a backend copy decision,
not a frontend release**. The KYC screen's blue "Verifying" card
(`AccountVerification/IndexView.vue:44-90`) is the in-house precedent for
presenting a third-party wait without alarm.

The exceptions that would still make queued read as trouble:

1. **The icon map fights the colour scheme.** `transaction_state_icon.js`
   hardcodes `ExclamationTriangleIcon` onto `UNDER-REVIEW` and `ON-HOLD`
   (`:34,:42`) regardless of how calmly the server colours them — and has
   **no fallback**: a brand-new state code renders `<component
   :is="undefined">` (no icon plus a Vue warning). This is the one frontend
   change a new Fincode state genuinely requires.
2. **The payment modal's queued face tells the wrong story** — "Please wait
   while we are setting up the payment." (`Fincode.vue:112-116`) for a
   transfer that is registered and simply waiting for the customer's money.
3. **A 12-hour wait leans entirely on the websocket** on the transaction view
   — `ItemView.vue:53-63` has no polling fallback, so a dropped connection
   shows stale state until manual refresh. (The dead `v-if="false"` block at
   `ItemView.vue:249-272` also styles `PENDING` amber — disabled today, but
   it's the template someone would copy.)

## 7. Contract asks (the backend's call — this feeds scoping)

What the client API would need to expose before the frontend can do its part:

| Need | Where it lives today | Suggested exposure |
|---|---|---|
| Payment expiry (§5) | `config/payment-expiry.php` only | `expires_at` on `PaymentTransactionResource` (+ event) |
| Blocked reason, customer-facing (§2) | `payout.failure_reason`, internal codes | typed + localised reason on transaction or payout resource |
| Partner terms text (§4) | paymentData `data` JSON blob | `payment_terms` on `PaymentTransactionResource` (+ event if late) |
| Queued semantics (§6) | payout `QUEUED` exposed but unread; transaction states server-authored | ship the new transfer state with calm `color_scheme` + honest `label`/`description`; tell us the `code` so we add the icon |
| Return URL ownership (§3) | app reads no query params | confirm return URLs stay backend-owned (or specify params) |

Frontend-only items needing no contract change: confirm-catch default `else`
(§2), Pay-button null guard (§1), callback-view poll + error face (§3),
terminal-state faces (§5), icon-map fallback (§6), redirect etiquette (§3),
re-entry point to `/pay/:id` (§3).

Per the handout's constraint, nothing above depends on the in-app verification
step completing for a Fincode transfer — the eKYC open question stays out of
scope until you settle it with Fincode.

---

## Backend answers (round 2, 2026-09-04) — and the payout audit

The backend verified all six sections against their code and answered the
contract asks. Resolutions, superseding the table above where they differ:

- **No new transfer state exists or is planned.** A Fincode transfer awaiting
  the customer's money sits in `PENDING-PAYMENT` like every other provider —
  the icon-map fallback this review called "genuinely required" is therefore
  not required for Fincode (still a reasonable hardening, no longer urgent).
  The real difference: **`transaction.payout` is populated (state `QUEUED`)
  during `PENDING-PAYMENT`** for Fincode, where every other provider has no
  payout row until the money clears.
- **Payout-presence audit (requested by backend): clean.** Nothing in the app
  reads `payout.state`, and nothing infers "payout started" from the payout
  object existing. The single payout-object read in any template is the
  collection-PIN row (`Transaction/ItemView.vue:201`), which behaves correctly
  for a present-but-unfunded payout — PIN visibility is server-driven via
  `collection_pin_available`. It did dereference `payout` unguarded, a crash
  risk for the *absent*-payout case every other provider hits pre-clearing;
  fixed with an optional chain alongside this note.
- **Return URLs stay backend-owned** (`routes/transport.php:42`, transaction id
  substituted into the path, not the query string). The callback view reading
  zero query params is correct and stays.
- **Terms text: field only, no event.** Fincode returns the terms in the same
  response as the payment URL — present at setup or not at all. Backend ships
  `payment_terms` on the payment resource (small, ticketed).
- **`expires_at`: absolute ISO-8601, nullable — and `null` means "never
  expires"** (manual payment and cash never expire by design), not "unknown".
  No countdown and no urgency state may render when it's absent. (Small,
  ticketed.)
- **Blocked reason is cross-provider and large.** Every provider writes
  internal text into `failure_reason`; the backend wants one properly-typed,
  customer-facing design rather than a Fincode-shaped patch, and the copy is a
  compliance question. To be scoped live; nothing frontend-buildable yet.
- The "Blazing Fast, Instant Transfers" calculator promise was pulled as its
  own change per the backend's request (PR #84).

Frontend work that becomes buildable when the two small backend tickets land:
the terms slot beside the Pay button, and the expiry line (wallet top-up
countdown pattern, rendering nothing when `expires_at` is null).

### Round 3 (2026-09-05): contract confirmed, surfaces built

The backend confirmed the verbal contract for both fields — `payment_terms`
(guaranteed plain text server-side, no event, same presence conditions as
`payment_url`) and `expires_at` (payment `created_at` + provider window; a
retried payment gets a fresh window; null = never expires). Both surfaces are
now built into the redirect providers' payable face, presence-gated, so they
render nothing until the backend ships and need no deploy coordination. The
expiry gap behaves as agreed on the record: when the clock passes while the
payment still reads `PENDING`, the line flips to "the payment window has
passed — checking…" and the Pay button stays live until the state retires the
screen.

Their reply also corrected a wire spelling — `TIMED-OUT`, hyphenated — and
our verification of `PaymentTransactionState.php` caught a second the same
way: `PART-REFUNDED`. The app's enum had both underscored, which would have
silently un-matched the terminal faces shipped in PR #83. Both values now
match the wire, with fixtures asserting the hyphenated forms.

### Round 4 (2026-09-05): backend shipped, exactly as contracted

`payment_terms` and `expires_at` are merged on the backend's `develop`,
unchanged from the confirmed contract — both on the payment object beside
`payment_url`, terms guaranteed plain text server-side (no sanitiser needed),
`expires_at` informational with the state deciding. Staging runs an older
build; the backend will ping the day it deploys, and we verify against real
payloads then rather than polling for it.

Facts QA should know when that day comes:

- **A null `payment_terms` on staging is expected, not a bug** — no partner
  has ever populated the field (Fincode's `create-transaction` call is still
  failing on their side). The backend will arrange a populated payment on
  request when we want to exercise the rendering against a real value.
- The two corrections they re-flagged are both already handled here: no new
  transfer state exists (nothing to add to the icon map), and the
  payout-presence audit was done in PR #85 — nothing reads `payout.state`,
  and the one existence-read (collection PIN) is guarded.

Last open item on their side: the cross-provider customer-facing refusal
reason (§2) — approach agreed internally, queued; they'll return with a shape
to confirm, same flow as these two fields.

---

## Appendix: pre-existing defects found in passing

None of these block Fincode; all predate it. Listed for whenever housekeeping
happens:

- `ItemView.vue:265` — "Total Amount" renders blank: reads
  `totalPaymentAmountCurrencyPrefixed` off the transaction, but the field
  lives on the payment (`:246` and `:292` on the same page do it right).
- `PaymentView.vue:53` — `if (canAttemptPayment === false)` compares the ref
  object, never true; the retry cap works only via the `watch` at `:70-74`.
- `PaymentCallbackView.vue:49-51` — no-op branch
  (`if (code === FAILED) { code = FAILED }`).
- `PaymentCallbackView.vue:73` and `ItemView.vue:61-63` — `onUnmounted`
  dereferences the transaction unguarded; throws if the user navigates away
  before the first fetch resolves.
- `transaction_state_icon.js:31,33` — duplicate `RISK-ASSESSMENT` key; the
  first icon is silently overwritten.
- `ItemView.vue:162` writes `_rtr`/`_rti` return hints that
  `CategoryView.vue:39-45` never reads — a customer uploading a document from
  a blocked transfer is dumped on the generic verification page with no way
  back to the transfer.
- KYC SDK `sdkError` is emitted by Sumsub/Persona/Didit and listened to by
  nothing (`DocumentTypeItem.vue:36-38`) — an SDK failure leaves an eternal
  spinner; Sumsub additionally reports only `GREEN` outcomes
  (`Sumsub.vue:63-67`).
