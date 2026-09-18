# API fixtures

55 **real** responses captured from a freshly seeded local `console.remitso`,
not hand-written mocks. They exist so tests fail when the backend changes a
field the SPA reads — the model mappers ignore unknown keys, so nothing else
catches that drift.

Load them with `tests/fixtures.js`:

```js
import {fixture, fixtureResponse, fixtureError, mockApi} from "./fixtures.js";

const payload = fixture('profile-05-onboarded');          // plain object
axios.get.mockResolvedValue(fixtureResponse('quote-send-100'));
axios.post.mockRejectedValue(fixtureError('confirm-quote', 412));

// or route several endpoints at once, longest pattern wins:
mockApi(axios, {
    '/client/v1/profile': 'profile-05-onboarded',
    '/client/v1/quote':   'quote-send-100',
    '/client/v1/quote/confirm': {name: 'confirm-quote', status: 412},
});
```

`fixture()` returns a fresh copy each call, so a test that mutates a payload
cannot leak into the next.

## Onboarding states

The five `profile-0*` fixtures are the same customer at each stage of the real
onboarding flow. They are the inputs the onboarding machine's guards read, so
they are the cheapest way to test navigation without standing up a backend.

| Fixture | `identityInformationRequired()` | `addressInformationRequired()` |
| ------- | --- | --- |
| `profile-01-fresh` | true | true |
| `profile-02-email-verified` | true | true |
| `profile-03-identity-done` | false | true |
| `profile-04-address-done` | false | false |
| `profile-05-onboarded` | false | false |

## The transfer flow, in order

`quote-default` → `quote-send-100` → `quote-saved` →
`transaction-quote-no-recipient` → `recipient-added` → `quote-set-recipient` →
`transaction-quote-with-recipient` → `confirm-quote` (a 412).

### Past the 412

`confirm-quote` is a 412 because a fresh customer always has a pending POI.
To get a real transaction the POI must be **approved in the console**
(AML & Compliance → the customer → Upload Proof of Identity → Approve), with
the name and date of birth matching the profile so the POI check passes.

These five were captured that way and **the re-capture script cannot
regenerate them** — it makes a new customer, who has no approved document:

| Fixture | What it is |
| ------- | ---------- |
| `profile-06-kyc-approved` | Same customer with POI cleared; `pending_documents` is now `POA`, `SOF` |
| `confirm-quote-success` | The 200 a confirm returns once KYC passes — a `Transaction` |
| `transaction-detail` | `GET /transaction/{id}` with its payment envelope (MONOOVA / BANK-TRANSFER, state `CREATED`) |
| `transactions-list` | The paginated list, with the `pagination` block |
| `payment-retry` | `POST /transaction/payment/{id}` |

Provider-specific payment screens (PENDING with a `payment_url`, REDIRECTED,
AUTHORIZED) are **not** capturable locally — the gateways need real
credentials. Keep using `makeTransaction({stateCode, providerCode})` from
`tests/helpers.js` for those.

## Error envelopes

These are the branches the SPA actually keys off, so they matter more than the
happy paths.

| Fixture | Status | Why it matters |
| ------- | ------ | -------------- |
| `confirm-quote` | 412 | `type=account_verification_required` with `pending_documents`. The wizard's flow-control response — see the 412 table in `CLAUDE.md`. |
| `error-422-confirm-missing` | 422 | `purpose_id`, `payment_method_id`, `third_party_declaration_accepted` |
| `error-422-signup-declaration` | 422 | The error `SignUpView` silently drops, making Continue look inert |
| `error-422-signup-validation` | 422 | Ordinary signup field validation |
| `error-422-login-bad-credentials` | 422 | **`message` only, no `errors` map** — a rejected credential is not a field error. A view that reads only `errors` shows nothing. |
| `error-422-login-unroutable-email-domain` | 422 | Login applies an MX check that signup does not — `@example.com` registers but can never sign in |
| `error-422-update-identity` | 422 | Partially-filled identity category, as `CustomerAttributeForm` renders it |
| `error-422-recipient-empty` | 422 | Per-attribute errors keyed by channel attribute name |
| `error-422-mobile-duplicate` | 422 | Mobile already in use |
| `error-401-profile` | 401 | Triggers the axios interceptor's redirect to `signIn` |
| `wallet-subscription-unavailable-404` | 404 | **No `type` field** → `WalletAvailability.UNAVAILABLE`. The whole probe contract. |
| `error-500-account-verification-token-no-vendor-credentials` | 500 | What a KYC token request returns with no vendor credentials configured |

## Quote edge cases

- `quote-alert-max-amount` — over the limit comes back as a **200 with
  `alerts.send_amount`**, not an error. `Calculator` copies it into the send
  field's errors.
- `quote-below-minimum` — a 200 with empty `alerts`.
- `quote-receive-100` — `amount_type=receive`, the other direction.

## Everything else

`countries` (250), `countries-source`, `payout-targets` (7 corridors),
`payout-methods`, `payout-channel` (the recipient form definition),
`document-categories` (POI/POA/SOF with their `api` codes),
`resources-relationships`, `resources-occupations`, `resources-salary-ranges`,
`password-policy`, `tasks`, `devices`, `recipients-list`,
`recipients-empty-list`, `transactions-empty-list`, `recipient-detail`,
`account-verification-token-system` (presigned S3 upload shape),
plus `signup` / `login` / `verify-email` / `update-*` success envelopes.

## The hotel journey

Four fixtures were captured from **payvel staging** rather than a local
console, because hotels need a supplier the local stack does not have
(SD-1218). They are the real answers to a Los Angeles search for 1-4 October
2026, trimmed to what the specs read - two hotels of 246, two rates of 18,
three photos of fifty - with nothing renamed:

| Fixture | Endpoint |
| ------- | -------- |
| `travel-regions-los-angeles` | `GET /travel/regions?query=Los` - an envelope: `regions`, `labels`, `is_featured` |
| `travel-hotels-search-region` | `POST /travel/hotels/search/region` - each hotel carries `rate_count` and one `cheapest_rate`, never a `rates[]` |
| `travel-hotel-view` | `POST /travel/hotel/{search}/{hotel}` - the one place a `rates[]` with tokens exists |
| `travel-quote-created` | `POST /travel/hotel/quote/{search}/{hotel}` - shaped from the quote contract; the hold itself was not taken out |

**Hand-migrated by SD-1249, pending re-capture.** SD-1245 turned
`payable_at_property` into a list of charges in the property's own currency, and
SD-1220 added `rates[].id` on the hotel page. Neither had reached payvel staging
when these were last captured, so three fixtures were edited by hand to the new
shape: the two captured `AUD 67.00` amounts became one `USD 44.00` `city_tax`
entry, the search results' `null` became `[]`, and the two hotel-page rates
gained ids (`rate-sd1249-*`). The amounts and ids are illustrative, not captured,
and the totals still carry the old retail prices rather than SD-1245's net rate.
Re-capture all four once staging runs a console with SD-1245, and delete this
note.

`tests/hotel-journey.spec.js` mounts the real screens over these and walks
lookup, results, hotel and hold. The two search fixtures are the shapes the
payvel results list crashed on before SD-1218, so a re-capture that changes
them should fail that spec rather than the mappers alone.

**`travel-hotel-view-extras` is not a capture either (SD-1259).** It is
`travel-hotel-view` with `hotel.house_rules.charges` replaced by the 18 charges
console PR #638 (SD-1256) lists for Conrad Los Angeles, built by its assembler
from the supplier's sandbox dump: each with `detail`, `applies_from_age` and
`applies_to_age`, and the euro, children's and late check-out charges the
console used to drop. The `labels` added are the console's own wording
(`HotelLabels::detail()`: a detail reads as its code without the type prefix,
sentence-cased). The `inclusion` of the three deposits is `UNSPECIFIED` as in
the capture, and `PAID` elsewhere, which is a guess. Re-capture it from the
hotel page once staging has the console change and a catalog reload, and
delete this note.

## Paying for a hotel by bank transfer, and cancelling it (captured)

**Captured from Payvel staging on 19 September 2026**, by walking SD-1269 and
SD-1270 in the browser against a console with SD-1238, SD-1248, SD-1261 and
SD-1230 deployed. One story, in order:

1. Charming Duplex Home (`01a0a76b-…`), a booking the hotel had confirmed
   and nobody had paid for, was paid by Bank Transfer (AUD 151.81). Pay Order
   answered `travel-order-payment-pending-account`, and the booking then read
   as `travel-order-view-deposit-pending`, and the list as
   `travel-orders-open-payment`.
2. Paying another booking by Bank Transfer was refused:
   `error-409-pay-order-account-held-by-order`, whose `held_by` names the
   first booking and its payment.
3. That payment was cancelled: `travel-order-payment-cancelled`. The booking
   then read as `travel-order-view-price-locked`, and cancelling it again
   answered `error-409-cancel-payment-not-open`.
4. `travel-order-view-complete` is a booking on the same account that had been
   paid.

So the ids agree across them: the payment id in Pay Order, in the order view's
`payments[]`, in `open_payment` and in `held_by.payment_id` is the same payment.
No money moved, and both bookings were left unpaid.

| Fixture | What it is |
| ------- | ---------- |
| `travel-order-payment-pending-account` | Pay Order, 201 `PENDING` with a Monoova bank transfer `client_payment_account` |
| `travel-order-view-deposit-pending` | Order view while that payment waits: two attempts that failed, then the open one |
| `travel-orders-open-payment` | The bookings list, five rows: one whose `open_payment` names the waiting payment, and four where it is null (two paid, two price locked) |
| `error-409-pay-order-account-held-by-order` | Pay Order 409 `account_held`, with `held_by` naming the booking in the way (SD-1261) |
| `travel-order-payment-cancelled` | Cancel Order Payment, 200: the payment in Pay Order's shape, `CANCELLED` |
| `error-409-cancel-payment-not-open` | Cancel Order Payment, 409 `payment_not_open` |
| `travel-order-view-price-locked` | Order view of a booking the hotel has confirmed and nobody has paid for: `FULFILLED`, "Price Locked", `is_paid` false, `next_step` `pay` (SD-1230) |
| `travel-order-view-complete` | Order view of a paid booking: `FULFILLED`, "Order Complete", `is_paid` true, `next_step` null |

`FULFILLED` only says the hotel confirmed the room. Whether it is paid is
`is_paid`, and the screens read that, never the state or the total.

## Written by hand, not captured

These could not be captured on the walk above. Each is written from the
backend's handout and its code on `develop`, and says so here until it is
captured:

| Fixture | What it is | Why it is not a capture |
| ------- | ---------- | ----------------------- |
| `travel-order-payment-created` | Pay Order, 201 `CREATED` with no account: the account is still being opened | Monoova answered with the account at once |
| `travel-order-payment-failed` | Pay Order, 201 `FAILED`. Carries `failure_reason`, which the app never shows | Needs a failing provider |
| `travel-order-view-deposit-setting-up` | Order view whose payment is still `CREATED` with no account | As `-created` |
| `travel-order-view-deposit-failed` | Order view whose payment `FAILED`. No `failure_reason`: the order view never carries it | As `-failed` |
| `error-409-pay-order-*`, other than `-account-held-by-order` | One Pay Order 409 per SD-1248 `type`, plus `untyped` for a console older than SD-1248. Messages are the customer wording the api sends for each type (`lang/en/message.php`, through `ServicePaymentRefusal::customerMessageKey()`); `untyped` keeps the old wording, as an old console would send it | Each needs its own refusal set up |
| `error-412-checkout-collides-held-by-transfer`, `error-412-wallet-topup-collides-held-by-topup` | The transfer confirm and wallet load collisions with `held_by`, one per remaining kind | Needs a waiting transfer or wallet load |
| `travel-order-view-awaiting-hotel` | Order view before the hotel has answered: `CONFIRMED`, "Awaiting Hotel Confirmation", `is_paid` false, `next_step` null (SD-1230) | Lasts a minute or two after booking |

The two hand-written order views listed `guests` as a bare array of rooms.
The api sends `{"rooms": [...]}`, as the capture shows, and they now do too;
the model reads a bare array as a flat list of guests, so the old shape named
nobody.

PayID cannot be captured at all: the provider's sandbox refuses it. Nothing
here is a PayID payment, and nothing in the app assumes which rail's
attributes it is showing.

## Sanitisation

Captures are scrubbed before they land here:

- AWS presigned-URL credentials replaced with a same-shaped placeholder.
- Laravel debug bodies reduced to `message` / `type` / `exception`; stack
  traces and absolute paths removed.
- Session tokens replaced.
- The account number of a real receiving account replaced with `123456789`.

`tests/fixtures-contract.spec.js` asserts no `AKIA…` key or `/Users/` path
survives, so a careless re-capture fails the suite.

Note the profile endpoint **masks the email local part**
(`re*************@gmail.com`). Never assert a full address.

## Re-capturing

Fixtures drift as the backend changes. To refresh them you need a local stack
(`docs/local-development.md`), then:

```sh
scripts/capture-api-fixtures.sh
```

It signs up a fresh customer, walks the whole onboarding and transfer flow,
writes `tests/fixtures/api/`, and sanitises the result.

Every re-capture churns UUIDs, timestamps and the generated email, so the diff
is always large. Read it for **shape** changes — a renamed or vanished field —
and ignore the identifier noise. Assertions here should key off structure and
enum values, never a specific id.

Behaviours to keep in mind when writing assertions:

- The generated address is `remitso.fixture+<epoch>@gmail.com`, and the profile
  endpoint masks it. Match a pattern, not a literal.
- A 422 does **not** always carry `errors` (see the table above).
- `transaction_number` is a **string** (`"TP7402166"`), even though
  `models/transaction.js` documents it as `{number|null}` and `Volume.vue`
  coerces it with `+ ''`.
- The transaction payload carries `timeline`, `documents`,
  `coupon_discount_amount` and `exchange_rate_before_coupon`, and the mappers
  read **none** of them. `Transaction` even declares a `documents` field that
  `getInstance` never fills. A contract test pins this so the gap stays
  visible rather than being rediscovered.
