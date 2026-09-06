# Local development

Running this SPA against a local `console.remitso` is fiddly for one reason:
**three separate host allowlists must agree**, and none of them fail with a
useful message. Get the hosts right and everything else is ordinary Vite.

## Why the hostnames matter

| Mechanism | Backend setting | Requirement |
| --------- | --------------- | ----------- |
| Session cookie | `SESSION_DOMAIN=".moneytransfer.app.localhost"` | The SPA must be served from a `*.moneytransfer.app.localhost` host, or the browser will not send the session cookie. |
| Sanctum stateful | `SANCTUM_STATEFUL_DOMAINS` | Must contain the SPA's host. |
| API authorisation | `SPA_DOMAINS` | Must contain the SPA's **scheme + host + port** exactly. `SkipApiAuthForSpa` compares the raw `Origin` header. |
| API routing | `API_HOST="api.moneytransfer.app.localhost"` | `/client/v1/*` is bound to this domain. Requests to any other host 404. |

macOS resolves any `*.localhost` name to `127.0.0.1` automatically, so no
`/etc/hosts` edits are needed.

Two failure modes worth recognising:

- `{"message":"Unauthorized"}` on every `/client/v1/*` call, including
  unauthenticated ones like `/password-policy` — your `Origin` is not in
  `SPA_DOMAINS`.
- `{"message":"No query results for model [App\\Models\\PlatformApp]"}` — the
  Origin matched, but the backend database has no `platform_apps` row named
  `web`. The database needs seeding.

## Backend

```sh
cd ../console.remitso

# Confirm the hosts this deployment expects:
grep -E '^(API_HOST|SPA_DOMAINS|SESSION_DOMAIN|SANCTUM_STATEFUL_DOMAINS|REVERB_)' .env

php artisan serve --host=127.0.0.1 --port=8000
php artisan reverb:start          # separate terminal, websockets
php artisan queue:work            # separate terminal, if exercising async work
```

`php artisan serve` binds a port, not a hostname — the `*.localhost` names all
resolve to `127.0.0.1:8000`, and Laravel routes on the `Host` header.

First-time database setup (PostgreSQL):

```sh
php artisan migrate
php artisan db:seed          # required — the SPA is unusable without reference data
```

Seeding is not optional. Countries, currencies, payout channels, payment
interfaces, document types and the `web` platform app all come from seeders; an
unseeded database returns `Unauthorized` or empty lists everywhere.

## Frontend

```sh
npm install
cp .env.example .env
```

`.env.example` is incomplete. A working local `.env`:

```dotenv
VITE_APP_ENV=local
VITE_APP_NAME="RemitSo Local"
VITE_APP_BASE_URL=http://api.moneytransfer.app.localhost:8000
VITE_APP_URL=http://app.moneytransfer.app.localhost:5174

VITE_AUTH_CHANNEL=EMAIL

VITE_USER_AGREEMENT_URL=https://example.test/terms
VITE_PRIVACY_POLICY_URL=https://example.test/privacy

# Reverb — must match the backend's REVERB_* values
VITE_REVERB_APP_KEY=RemitSo
VITE_REVERB_SCHEME=http
VITE_REVERB_HOST=127.0.0.1
VITE_REVERB_PORT=8080
VITE_REVERB_AUTH_URL=http://api.moneytransfer.app.localhost:8000/broadcasting/auth
```

`VITE_APP_ENV=local` is what selects Reverb over Pusher in `main.js`. Without
it the app tries to reach Pusher's cloud and no realtime event ever arrives.

Then serve on the host and port the backend expects. `vite.config.js` has no
`server` block, so pass it on the command line:

```sh
npx vite --host app.moneytransfer.app.localhost --port 5174 --strictPort
```

`--strictPort` matters: if 5174 is taken, Vite silently moves to 5175 and every
API call starts returning `Unauthorized`.

Open <http://app.moneytransfer.app.localhost:5174>.

If Vite rejects the hostname, add it to `server.allowedHosts` in a local
override rather than committing a change to `vite.config.js` — that file is
shared with ~45 brand branches and is a needless conflict source.

## Environment variables

Read by the code; those marked ✗ are absent from `.env.example`:

| Variable | | Purpose |
| -------- |-| ------- |
| `VITE_APP_BASE_URL` | ✓ | axios base URL |
| `VITE_APP_ENV` | ✗ | `local` selects Reverb; anything else selects Pusher |
| `VITE_APP_NAME` | ✗ | brand name in copy |
| `VITE_APP_URL` | ✗ | marketing site; the "close" links on auth screens |
| `VITE_AUTH_CHANNEL` | ✓ | `EMAIL` \| `MOBILE_NUMBER` \| `BOTH` — picks the onboarding machine |
| `VITE_USER_AGREEMENT_URL` | ✗ | signup terms link |
| `VITE_PRIVACY_POLICY_URL` | ✗ | signup privacy link |
| `VITE_THIRD_PARTY_SIGNUP_DECLARATION` | ✗ | if set, renders a required signup checkbox with this text |
| `VITE_THIRD_PARTY_TRANSACTION_DECLARATION` | ✗ | same, on transfer confirm |
| `VITE_VOLUME_PAYMENT_MERCHANT_ID` | ✗ | Volume Payments SDK |
| `VITE_REVERB_*` | ✓ | local websockets |
| `VITE_PUSHER_*` | ✓ | hosted websockets |
| `VITE_APP_USERNAME` / `VITE_APP_PASSWORD` | ✓ | **unused by this SPA** — for native clients using `/get-app-token` |
| `VITE_DEV_SERVER_HOST` / `VITE_DEV_SERVER_HTTPS` | ✓ | **read by nothing**; no branch wires a `server` block |

## Tests

```sh
npm test          # vitest run — 66 tests, ~1s
```

jsdom, no backend required. `tests/helpers.js` provides `installFakeEcho()`,
`makeTransaction()`, `makeTransactionPayload()` and the modal/lottie stubs.

Remember that `machines/*.js` call `useCustomerStore()` at module scope: any
spec that mounts a view importing a machine must `setActivePinia(...)` **before**
the dynamic `import()` of the view. `tests/transfer-confirm-refusals.spec.js`
shows the pattern.

## Exercising the flows

Useful things that are hard to reach by clicking:

- **Payment provider screens** — the provider component is chosen by
  `transaction.payment.paymentProvider.code`. Rather than arranging real
  provider config, the provider specs mount the component directly with
  `makeTransaction({stateCode, providerCode})`.
- **Payment state transitions** — fire the broadcast by hand. `installFakeEcho()`
  returns a listener map keyed `"<channel>:<event>"`, so a test can invoke
  `listeners['client-payment.pay-1:PaymentTransactionStateUpdated']({state: …})`.
- **Confirm refusals** — mock `axios.post` to reject with the `412` shape you
  want; see `tests/transfer-confirm-refusals.spec.js`.
- **Wallet availability** — the whole module keys off one probe. Mock
  `GET /wallet/subscription` to a `200`, a `404` with
  `{type, wallet_offered: true}`, or a bare `404` to reach ACTIVE / ELIGIBLE /
  UNAVAILABLE respectively.
