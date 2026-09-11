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

## Sanitisation

Captures are scrubbed before they land here:

- AWS presigned-URL credentials replaced with a same-shaped placeholder.
- Laravel debug bodies reduced to `message` / `type` / `exception`; stack
  traces and absolute paths removed.
- Session tokens replaced.

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
