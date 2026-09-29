# How the frontend handles payment providers

A handout for the back office. It describes what the customer-facing app does with a payment from the moment a quote is confirmed to the moment the transfer page shows "paid", which fields and events it depends on, and what to hand the frontend team when a new provider is being integrated.

Everything here is taken from the frontend as of 10 September 2026; payvel and tranxfa share the same code for this area. Revised the same day after the back office audited the ten invariants against the API; the corrections are marked.

## 1. The journey in one line

```
confirm quote  →  transaction + payment created  →  /pay/{transactionId}
     →  provider component picked by payment_provider.code
     →  frontend watches the payment (websocket + poll)
     →  terminal state  →  /transaction/{transactionId}
```

Providers that send the customer away (hosted pages) end up on `/payment/cb/{transactionId}`. That page reads nothing from the URL. It asks the API for the transaction and waits for the state to settle.

The URL registered with a provider is not ours. The API registers a URL on its own transport host, and the customer reaches our page through two redirects:

```
provider  →  {transport host}/payment/cb/{paymentInterfaceCode}
          →  {transport host}/payment/check-status/{transactionId}
          →  {frontend origin}/payment/cb/{transactionId}
```

When a partner asks which domain to whitelist, it is the transport host.

## 2. What the frontend sends

| When | Request | Body |
|---|---|---|
| Customer presses Confirm on the wizard | `POST /client/v1/quote/confirm/{quoteId}` | `purpose_id`, `payment_method_id`, `payment_data` (object of attribute → value, or null), `third_party_declaration_accepted`, `wallet_otp` (wallet only) |
| Payment page opens, every poll, callback page | `GET /client/v1/transaction/{transactionId}` | – |
| Customer says they have paid (bank transfer, Paga, Monoova, Apaylo) | `POST /client/v1/transaction/payment-sent/{paymentId}` | – |
| Customer presses "Try the payment again" | `POST /client/v1/transaction/payment/{transactionId}` | `payment_data` attributes for providers that collect them (Apaylo), otherwise null |

The retry endpoint's `422` answer is shown field by field: `errors` keyed by the attribute name from `payment_data_requirements`. Any other failure shows one sentence with "Nothing has been charged".

## 3. What the frontend reads

The `payment` object on the transaction. Field names are the JSON keys the frontend maps.

| Field | Used for |
|---|---|
| `id` | Channel name (`client-payment.{id}`) and the payment-sent call |
| `state.code` | Which screen the customer sees (section 5). `state.color_scheme` colours the badge |
| `payment_provider.code` | Which component renders (section 6). `title` and `description` are shown |
| `payment_provider.payment_data_requirements[]` | Extra fields the customer fills before paying: `attribute`, `type`, `label`, `input_mode`, `is_required`, `info`, `value` |
| `payment_method` | Shown on the receipt |
| `payment_url` | The Pay button for hosted providers. A payment is only payable when `state.code` is `PENDING` **and** this is present |
| `shared_reference` | The reference the customer quotes to their bank |
| `client_payment_account` | Bank-transfer instructions: `institution_name`, `instruction_text`, `payment_reference`, `wait_time_message`, `attributes[]` of `{key, value}` rendered as copyable rows |
| `expires_at` | ISO-8601. Renders "Payable for another …" and "Please pay by … (your local time)". **Null means no deadline**, and the frontend then says nothing about time |
| `payment_terms` | Plain text, rendered verbatim with line breaks kept. Never HTML |
| `total_payment_amount`, `_formatted`, `_currency_prefixed` | Amount to pay. `_currency_prefixed` is what the customer sees |
| `customer_confirmed_payment` | Hides the "I've paid" button once true |
| `awaiting_confirmation` | Boolean. Nothing for the customer to do; the provider settles the payment on its own. `PENDING` with no `payment_url` is healthy while this is true, and the "taking longer than usual" notice stays quiet. Absent means false |
| `payment_account` | Receipt line on the transaction page (`institution`, `accountNumber`) |

Two things the frontend never does: it never computes an amount, and it never decides that a payment is paid. Both come from the API.

One field the frontend deliberately does not read: `failure_reason`. It exists on every failed payment but is written for operators and names processors, so the failure screens use the frontend's own wording. Customer-facing failure text is a separate piece of work on the API side, provider by provider.

## 4. What the frontend listens to

Channel `client-payment.{paymentId}`, event `PaymentTransactionStateUpdated`.

The API sends five keys on every event: `id`, `state` (an object with `code`), `shared_reference`, `vendor_unique_id` and `payment_url`, each resolved from the database at the moment of broadcast. The frontend reads `state`, `shared_reference` and `payment_url` and applies **only the keys present**; it ignores `vendor_unique_id`. Because every value is resolved at broadcast time, a `null` you receive is a real null. If a value the page holds is ever cleared by an event, that is the bug to report.

The channel is public on this app (`src/realtime.js`); the local Reverb build authorises with the customer session token header set in `main.js`. payvel's copy of this handout describes the private-channel variant, which this app does not have.

Document events (`CustomerDocumentUploaded`, `Processing`, `Approved`, `Rejected`) go on `client-customer.{customerId}` and are unrelated to payments.

## 5. Payment states and what the customer sees

| `state.code` | Screen | Notes |
|---|---|---|
| `CREATED`, `INITIALIZED`, `PENDING` | "Complete your payment": bank details, or the Pay button, or the embedded bank picker | Hosted providers keep polling until `payment_url` is also present |
| `REDIRECTED` | "We're watching for your payment" | Set by the frontend itself when the customer clicks Pay or "I've paid", then confirmed by the API |
| `AUTHORIZED`, `CAPTURED` | "Payment received", then the transaction page after 1.5 s | Both count as paid |
| `FAILED` | "Payment failed", "Try the payment again" | Terminal for polling. Retry creates a new payment |
| `TIMED-OUT` | "This payment has expired" | Terminal |
| `CANCELLED` | "This payment was cancelled" | Terminal |
| `REFUNDED`, `PART-REFUNDED` | "Payment refunded" | Terminal |

Anything else renders nothing. A new state code needs a frontend change before it ships.

## 6. Provider families

| `payment_provider.code` | Component | Family | What it needs from the API |
|---|---|---|---|
| `MANUAL-PAYMENT` | ManualPayment | Bank transfer | `client_payment_account` with `payment_reference`; `expires_at` if there is a deadline |
| `PAGA` | PagaPayment | Bank transfer | Same as manual |
| `MONOOVA` | Monoova | Bank transfer (PayID) | Same as manual; supports retry |
| `APAYLO` | Apaylo | Hosted, with extra fields | `payment_data_requirements` for the Interac fields; `payment_url` opens in a new tab; also has "I've paid" |
| `PAY360`, `PAY-CROSS`, `FINCODE`, `CINET_PAY` | Pay360, PayCross, Fincode, CinetPay | Hosted redirect | `payment_url`; `expires_at` and `payment_terms` optional; return to `/payment/cb/{transactionId}` |
| `VOLUME-PAYMENTS` | Volume | Embedded SDK (open banking) | `total_payment_amount`, `id` as the merchant payment id, the transaction number as the reference. Needs `VITE_VOLUME_PAYMENT_ENVIRONMENT` and `VITE_VOLUME_PAYMENT_MERCHANT_ID` at build time |
| `WALLET` | WalletPayment | Internal | A `wallet_otp` at confirm time; the payment settles server-side |
| `BELMONEY-CARD` | BelmoneyCard (tranxfa only) | Hosted card page, same tab, with 3-D Secure | `payment_url` with `PENDING` for the redirect shape; `awaiting_confirmation` for the two shapes that need nothing from the customer; a pre-flight address check that fails `INITIALIZED -> FAILED` with no redirect; `expires_at` (one day, then `CANCELLED`); no payment-sent, no extra fields, no build keys, no CSP change |

Note the code spelling: every code uses hyphens except `CINET_PAY`, which uses an underscore. The frontend matches the string exactly.

### Bank transfer

The customer sees the account rows, the amount with a copy button, the reference, the deadline if there is one, and an "I've paid" button. Pressing it calls the payment-sent endpoint and flips the screen to "watching". The state is reverted and a message shown if that call fails, so the customer can press again.

### Hosted redirect

The customer sees a Pay button that is a plain link to `payment_url`. Clicking it marks the payment `REDIRECTED` locally. The provider must return the customer to `/payment/cb/{transactionId}` on the frontend origin, with anything else in the URL ignored. A payment whose `expires_at` has passed still shows the button; the clock only changes the wording. The state decides.

### Embedded SDK

Volume injects its own bank picker into the page. The SDK's `payment_initiated` event flips the state to `REDIRECTED` locally. SDK errors show a reload prompt. If the build has no merchant id the screen says the method is unavailable and no money moves.

## 7. The watch protocol

Every provider component uses the same composable (`src/composables/payment_watch.js`). The order matters.

```mermaid
sequenceDiagram
    participant C as Customer's browser
    participant A as API
    participant W as Websocket
    C->>W: subscribe client-payment.{id}
    C->>A: GET /transaction/{id} (immediately, not awaited)
    Note over C: poll every 5 s (10 s for hosted) until payable or terminal
    W-->>C: PaymentTransactionStateUpdated {state, shared_reference?, payment_url?}
    Note over C: apply only the keys present; drop any poll answer that was in flight
    A-->>C: transaction (poll)
    Note over C: stop polling when PENDING (+ payment_url for hosted) or terminal
    Note over C: tab becomes visible again → one more GET
```

Rules that follow from it:

- The websocket subscription lands about 2.5 s after the page starts loading. Anything broadcast before that is picked up by the first GET. Do not rely on the broadcast alone.
- A poll answer that was in flight when a broadcast arrived is thrown away. Broadcasts win.
- Polling stops once the payment is payable, so a hosted provider must have `payment_url` in the transaction response, not only in a later broadcast, or the page waits until the next tick.
- `FAILED` stops polling. A failed payment does not keep asking.
- The frontend re-fetches when the tab is looked at again, so a dropped socket costs one glance.

## 8. Retry

The payment page allows three attempts in total. The first payment is attempt one. A fourth press is not sent; the page says the transfer is paused, tells the customer to quote the transaction number to support, and returns them to the transaction after 8 s. An attempt is counted only when the server answers. A request that never left the phone does not count.

The retry response replaces the `payment` object on the page in full, so it must be the complete new payment: `client_payment_account`, `payment_data_requirements`, `payment_terms` and `payment_account` included. Until 10 September 2026 it was missing all four, so a bank-transfer customer lost their account rows and reference on retry until the next poll.

`payment_url` is always null on the retry response for hosted providers. Creating the payment and calling the provider are separate steps, and the provider call runs on a queue after the API answers. The page mounts the provider component afresh for the new payment id, subscribes to its channel, and polls until the URL arrives, usually within seconds. Do not expect a Pay button straight from the retry answer.

## 9. Invariants the API must keep

1. `state.code` is one of the eleven codes in section 5. New codes need a frontend release first.
2. `payment_url` is present in the transaction response whenever a hosted payment is payable, not only in the broadcast.
3. A broadcast omits keys it has nothing to say about. It never sends `null` for a value that still holds.
4. `expires_at` is null when there is no deadline. Do not send a far-future placeholder; the frontend would render it.
5. `payment_terms` is plain text. It is rendered verbatim.
6. `client_payment_account.attributes[].key` is the label the customer reads. Write it for a customer, not a system ("BSB", "Account number", not "bsb_code"). These keys are typed by an operator in the console per client, so this is a data-quality check, not something the API can enforce.
7. `total_payment_amount_currency_prefixed` is the only amount string the customer sees on the payment screens.
8. After `payment-sent`, `customer_confirmed_payment` is true on the next read.
9. The customer's final landing page after a hosted payment is `{frontend origin}/payment/cb/{transactionId}`, reached through the API's transport host (section 1). Nothing in that URL is read.
10. Retry returns the whole new payment, with `payment_url` null for hosted providers until the queued provider call fills it, and `422` errors keyed by `payment_data_requirements[].attribute`.
11. A hosted payment that reaches `PENDING` without `payment_url` either carries `awaiting_confirmation: true`, meaning the provider will settle it, or gets its URL within seconds. Anything else is stuck: the page shows "taking longer than usual" after a minute with a way back to the transfer, but it cannot complete the payment.
12. Every `payment_provider.code` the API can send for this app has a component (section 6). A code without one now renders "This way to pay isn't available in the app yet" rather than a blank page; the back office has adapters with no screen here (BelmoneyCard, CheckoutCom, Cybrid, Leatherback, Volt as of September 2026).

## 10. What to hand the frontend for a new provider

Fill this in before the frontend work starts. Every row is something the frontend has needed from a past integration and had to ask for.

| Item | Example / options |
|---|---|
| `payment_provider.code`, exactly as the API sends it | `PAY360` |
| Family | bank transfer / hosted redirect / embedded SDK / internal |
| For hosted: does `payment_url` arrive with `PENDING` or later? Same tab or new tab? | "with PENDING, same tab" |
| For hosted: the domain you will whitelist with the provider (the API's transport host), and confirmation the chain ends on `{frontend origin}/payment/cb/{transactionId}` | `https://transport.example/payment/cb/{paymentInterfaceCode}` |
| Is this code meant for this app at all? If so, which family, so a component exists before the adapter ships | "yes, payvel; hosted redirect" |
| For bank transfer: which `client_payment_account.attributes` keys, and the `payment_reference` rule | "BSB, Account number, Account name; reference must be quoted or the deposit is unmatched" |
| Does the payment expire? Where does `expires_at` come from, and what happens at expiry? | "45 min from creation; state becomes TIMED-OUT" |
| Extra customer input (`payment_data_requirements`) with types and validation messages | "email (email), security question (text), required" |
| Which states the provider can produce, in order, and which are terminal | `PENDING → REDIRECTED → AUTHORIZED → CAPTURED`, `FAILED` |
| Does the provider confirm asynchronously after the customer returns? Typical delay | "webhook, usually under 60 s" |
| Does `payment-sent` apply? What does it change server-side? | "yes; marks customer_confirmed and starts matching" |
| Retry: new payment or same payment? What `payment_data` is needed again? | "new payment; Interac fields re-collected" |
| Refunds: can `REFUNDED` / `PART-REFUNDED` occur, and when | "yes, on amount mismatch after 30–60 min" |
| Build-time keys the frontend needs (SDK ids, environments) | `VITE_VOLUME_PAYMENT_MERCHANT_ID` |
| A staging transaction id in each state for the frontend to look at | – |
| The customer-facing sentence for "what happens now" (`wait_time_message`) | "This usually takes under a minute. We will email you." |

Write the copy items in words a customer would use: "code" not OTP, "transfer" not transaction, "delivery method" not payout. The frontend keeps a vocabulary sheet and will otherwise rewrite them.

## 11. Things that went wrong before, so they are not repeated

- Five providers listened to the broadcast and never polled. The event arrived before the listener existed, and the page spun forever. Fixed by the shared composable; do not add a provider that bypasses it.
- A broadcast without `payment_url` erased the URL the Pay button needed. Fixed by applying only present keys; keep sending only what changed.
- `FAILED` was not treated as terminal, so a failed payment polled every 10 s for as long as the customer looked at it.
- A retry counter incremented before the request went out, so a network failure used up an attempt.
- Manual and Paga instructions never said the reference must go in the bank's reference field, and never showed a deadline. The deadline now shows when `expires_at` is present, so send it if there is one.
- The Volume SDK was re-injected on every reactive change and stacked bank pickers on top of each other. It now initialises once.
- The retry endpoint returned a payment without its account details, reference, extra fields, terms or account. Fixed on the API on 10 September 2026 after this handout was audited.
- A provider code with no component rendered a blank payment page. The page now says the method is not available in the app.
- After a retry the page kept watching the old payment's channel with polling stopped, so a hosted retry never got its Pay button. The provider component now mounts afresh for the new payment.
- Belmoney Card can take the card without a redirect. Without `awaiting_confirmation` that healthy state was indistinguishable from a stuck one and would have shown the "taking longer than usual" notice on every such payment.
