# API surface

Every endpoint this SPA calls, and the composable that owns it. All paths are
relative to `VITE_APP_BASE_URL` and sit under the backend's API host.

Generated from source; to refresh:

```sh
grep -rhoE "axios\.(get|post|put|delete)\(\s*[\`'\"][^\`'\"]+" src \
  | sed -E "s/axios\.//; s/\(\s*[\`'\"]/ /" | sort -u
```

## Transport

- Cookie session (Laravel Sanctum), **not** bearer tokens.
- `axios.defaults.withCredentials = true`, `withXSRFToken = true`.
- Every request gets `Accept: application/json` and
  `ngrok-skip-browser-warning: yes` (devs tunnel the backend).
- A response interceptor redirects to `signIn` on `401`; opt out per-request
  with `config.skipAuthRedirect = true`.
- `GET /sanctum/csrf-cookie` must precede the first state-changing request.

The backend additionally gates `/client/v1/*` on the caller's `Origin` matching
its `SPA_DOMAINS` allowlist (`SkipApiAuthForSpa`), which is why the dev server
must run on an exact expected host **and port**.

## Auth and profile — `customer_utils`

| Method | Path                              | Notes                                   |
| ------ | --------------------------------- | --------------------------------------- |
| POST   | `/client/v1/signup`               | `email`, `password`, `confirm_password`, `third_party_declaration_accepted` |
| POST   | `/client/v1/login`                | returns the profile payload             |
| POST   | `/client/v1/get-login-otp`        | mobile/OTP sign-in channel              |
| POST   | `/client/v1/mfa`                  | `otp`                                   |
| POST   | `/client/v1/resend-mfa-otp`       |                                         |
| POST   | `/client/v1/logout`               |                                         |
| GET    | `/client/v1/profile`              | de-duplicated by `refresh()`            |
| POST   | `/client/v1/forgot-password`      |                                         |
| POST   | `/client/v1/reset-password`       | token is **base64**; client `atob()`s it |
| POST   | `/client/v1/change-password`      |                                         |
| GET    | `/client/v1/password-policy`      | cached in `password_policy` store       |
| POST   | `/client/v1/resend-email-verification` |                                    |
| POST   | `/client/v1/verify-email-address` | `otp`                                   |
| POST   | `/client/v1/update-email`         |                                         |
| POST   | `/client/v1/update-country`       | `country_id`                            |
| POST   | `/client/v1/update-mobile-number` | `mobile_number_country_id`, `mobile_number` |
| POST   | `/client/v1/update?category=…`    | dotted keys un-flattened to nested objects |
| POST   | `/client/v1/apply-info-from-poi`  | resolves a POI/profile name mismatch    |
| GET    | `/client/v1/tasks`                | dashboard to-do list                    |
| GET    | `/client/v1/devices`              |                                         |
| DELETE | `/client/v1/device/{id}`          |                                         |

## KYC — `customer_utils`

| Method | Path                                                        | Notes |
| ------ | ----------------------------------------------------------- | ----- |
| GET    | `/client/v1/document-categories`                            |       |
| GET    | `/client/v1/account-verification/token/{categoryId}/{typeId}` | Returns a provider session token **or** a presigned S3 PUT URL, depending on the document type's `api`. Pass `file_name`/`file_type` for `SYSTEM` uploads, `return_url` for hosted-redirect providers. |
| GET    | `/client/v1/account-verification/liveliness-token`          | only used by dead code |
| POST   | `/client/v1/document/upload`                                | `pages[]` = S3 object keys, plus `document_category_id` / `document_type_id` query params |

Document bytes go **directly to S3** via `aws_s3_utils.uploadToPreSignedS3Url`
(that request deliberately disables credentials and XSRF). Only object keys
reach the API.

## Quotes and transfer — `quote_utils`

| Method | Path                                | Notes                                    |
| ------ | ----------------------------------- | ---------------------------------------- |
| GET    | `/client/v1/quote`                  | live re-quote; params `amount_type`, `amount`, `payment_*_id`, `payout_*_id` |
| POST   | `/client/v1/quote`                  | persists the quote → id for the wizard   |
| GET    | `/client/v1/quote/{id}`             | → `TransactionQuote`                     |
| POST   | `/client/v1/quote/recipient/{id}`   | `recipient_id`                           |
| POST   | `/client/v1/quote/confirm/{id}`     | `purpose_id`, `payment_method_id`, `payment_data`, `third_party_declaration_accepted` |

`GET /quote` failure modes the Calculator handles explicitly: `422` with
`errors.amount` / `errors.send_amount` (attributed to the send or receive field
by `amountType`), and `503` with a `message` (rates unavailable).

`POST /quote/confirm/{id}` is the flow-control endpoint — see the `412` `type`
table in `CLAUDE.md`.

## Recipients — `recipient_utils`

| Method | Path                                          | Notes                       |
| ------ | --------------------------------------------- | --------------------------- |
| GET    | `/client/v1/recipients`                       | paginated                   |
| GET    | `/client/v1/recipients/whisper`               | typeahead                   |
| POST   | `/client/v1/recipients/add`                   | `payout_channel_id`, optional `quote_id` |
| GET    | `/client/v1/recipient/{id}`                   |                             |
| POST   | `/client/v1/recipient/edit/{id}`              |                             |
| DELETE | `/client/v1/recipient/{id}`                   |                             |
| GET    | `/client/v1/recipient/name-lookup/{channelId}` | resolves account → name    |
| POST   | `/client/v1/recipient/send-money/{id}`        | quote scoped to a recipient |

## Payout configuration — `payout_channel_utils`

| Method | Path                          | Returns                                    |
| ------ | ----------------------------- | ------------------------------------------ |
| GET    | `/client/v1/payout/targets`   | country + currency pairs                   |
| GET    | `/client/v1/payout/methods`   | methods for a target                       |
| GET    | `/client/v1/payout/channel`   | **the channel + its `attributes[]`** — the form definition |

`/payout/channel` is what makes recipient forms dynamic. Its
`configuration` carries `recipient_type`, `confirm_account_number`,
`name_lookup_requirements`, `name_validation_requirements`.

## Transactions — `transaction_utils`

| Method | Path                                            | Notes                    |
| ------ | ----------------------------------------------- | ------------------------ |
| GET    | `/client/v1/transactions`                       | paginated                |
| GET    | `/client/v1/transaction/{id}`                   |                          |
| POST   | `/client/v1/transaction/payment/{id}`           | retry / re-init payment  |
| POST   | `/client/v1/transaction/payment-sent/{paymentId}` | "I've made payment"    |
| GET    | `/client/v1/transaction/payment/currencies`     |                          |
| POST   | `/client/v1/transaction/statement`              | statement request        |

## Wallet — `wallet_utils`

| Method | Path                                       | Notes                              |
| ------ | ------------------------------------------ | ---------------------------------- |
| GET    | `/client/v1/wallet/subscription`           | **the availability probe** — its 404 body is meaningful |
| POST   | `/client/v1/wallet/subscription`           | `terms_version_id` (accept)        |
| POST   | `/client/v1/wallet/subscription/close`     | requires zero balance              |
| GET    | `/client/v1/wallet/terms`                  |                                    |
| GET    | `/client/v1/wallet`                        | balances                           |
| GET    | `/client/v1/wallet/movements`              | paginated ledger                   |
| GET    | `/client/v1/wallet/deposit-instructions`   |                                    |
| GET    | `/client/v1/wallet/topups`                 |                                    |
| POST   | `/client/v1/wallet/topups`                 | declare an incoming top-up         |
| POST   | `/client/v1/wallet/topups/{id}/cancel`     |                                    |
| POST   | `/client/v1/wallet/spend-otp`              | `quote_id`; authorises a wallet spend |

Refusal `type` values are enumerated in `enums/wallet_refusal_type.js`.

## Reference data

| Method | Path                                             | Composable          |
| ------ | ------------------------------------------------ | ------------------- |
| GET    | `/client/v1/countries`                           | `country_utils` (cached) |
| GET    | `/client/v1/countries/source`                    | `country_utils`     |
| GET    | `/client/v1/resources/relationships`             | `resource_utils`    |
| GET    | `/client/v1/resources/occupations`               | `resource_utils`    |
| GET    | `/client/v1/resources/currency-salary-ranges`    | `resource_utils`    |
| GET    | `/client/v1/resources/sub-delivery-options/{id}` | `resource_utils`    |
| GET    | `/client/v1/monthly-budgets/current`             | `monthly_budget_utils` |
| GET    | `/client/v1/monthly-budgets/history`             | `monthly_budget_utils` |
| POST   | `/client/v1/monthly-budgets`                     | `monthly_budget_utils` |

## Broadcast channels

| Channel                          | Events                                                   |
| -------------------------------- | -------------------------------------------------------- |
| `client-customer.{customerId}`   | `CustomerDocumentUploaded`, `CustomerDocumentProcessing`, `CustomerDocumentApproved`, `CustomerDocumentRejected` |
| `client-payment.{paymentId}`     | `PaymentTransactionStateUpdated`                          |
| `client-transaction.{transactionId}` | transaction state updates                            |

## Backend endpoints the SPA does not use

The console exposes considerably more than this SPA consumes. Present in
`routes/api.php` but unused here — relevant if you are asked to build one of
these features, since the backend side may already exist:

`/client/v1/get-app-token`, `/biometric-enrolment`, `/biometric-login`,
`/create-pin`, `/address/autocomplete`, `/account-closure`,
`/account-closure-reasons`, `/exchange-rates`, `/exchange-rate-alert*`,
`/public/quote`, `/service-status`, `/version-update`,
`/customer/identity-verification-token`, `/customer/attributes`, and the
`/travel/*` hotel-booking family (used only by `feature/travel_hotels`).
