# How the frontend handles identity providers

A handout for the back office. It describes what the customer-facing app does with an identity or document check from the moment a category is pending to the moment the document shows "approved", which fields, tokens and events it depends on, and what to hand the frontend team when a new provider is being integrated.

Everything here is taken from the frontend as of 10 September 2026; payvel and tranxfa share this code. Revised the same day after the back office audited the ten invariants against the API; the corrections are marked. The companion document for payments is `payment-adapters-frontend-handout.md`.

## 1. The journey in one line

```
API says a category is pending  →  customer picks a document type
     →  frontend asks for a token for that category + type
     →  provider component picked by document_type.api
     →  vendor SDK / redirect / our own upload
     →  "done" from the vendor  →  frontend refreshes the profile
     →  the category leaves pending_documents  →  the transfer continues
```

Two places start this. The Account verification page (`/account-verification`, then `/account-verification/upload/{categoryId}`) lists what is pending on the profile. The transfer wizard starts it when `POST /quote/confirm` answers `412 account_verification_required` with the list of pending categories. Both end the same way: the frontend refreshes the profile and waits for the category to disappear from `pending_documents`.

## 2. What the frontend sends

| When | Request | Body / params |
|---|---|---|
| Wizard needs the identity category (Upload another document) | `GET /client/v1/document-categories` | – |
| Customer picks a document type | `GET /client/v1/account-verification/token/{categoryId}/{typeId}` | `return_url` for redirect providers; `file_name` and `file_type` for our own upload |
| Our own upload, per file | `PUT {presigned S3 url}` | The file as the body, `Content-Type` = file type, no cookies |
| Our own upload, when every file is on S3 | `POST /client/v1/document/upload?document_category_id=&document_type_id=` | `pages`: the S3 object keys, in order |
| Customer chooses "Use the details from my ID" after a mismatch | `POST /client/v1/apply-info-from-poi` | – |
| Dashboard to-do list | `GET /client/v1/tasks` | – |
| After any provider says "done" | `GET /client/v1/profile` (the normal refresh) | – |

`GET /client/v1/account-verification/liveliness-token` has no caller in the frontend since the liveness component was removed on 9 September 2026.

## 3. What the token means, by provider

One endpoint, one field (`token`), five meanings. The frontend decides what to do with it from `document_type.api`, so the two must agree.

| `document_type.api` | Component | What `token` is | How it is used |
|---|---|---|---|
| `SUMSUB`, `SUMSUB-VIA-FINCODE` | Sumsub | A WebSDK access token | `@sumsub/websdk` mounts an iframe in the modal. The same endpoint is the SDK's refresh callback, so it must answer again for the same category and type |
| `CYBRID` | Persona | A Persona inquiry id | `persona` client opens the inquiry in the modal |
| `SHUFTI` | Shufti | A URL | The customer is sent there in the same tab. `return_url` is the page they were on, sent as a query param; the API passes it to Shufti as `redirect_url`, unchanged |
| `UPPASS` | UpPass | A URL | Opens in a new tab. No `return_url` is sent |
| `DIDIT` | Didit | A session id | `@didit-protocol/sdk-web` opens `https://verify.didit.me/session/{token}` as an overlay. `return_url` is sent; the API passes it to Didit as `callback`, unchanged |
| `SYSTEM` | System | A presigned S3 `PUT` URL, one per file | The frontend uploads the file itself, then calls `document/upload` with the object keys |

For `SYSTEM`, the category decides the screen: `POI` shows a front-and-back photo upload (images only); every other category shows a multi-file upload (JPEG, PNG, WebP, PDF). Both cap files at 10 MB and validate before asking for a token.

The object key sent in `pages` is taken from `object_key` on the token response when the API sends it. When it does not, the frontend derives it from the presigned URL's path with the first two segments removed, which depends on the URL's shape rather than the key layout (today a bare `{ulid}.{ext}` at the bucket root). The back office has offered to send `object_key`; once it does, the derivation is only a fallback.

## 4. What the frontend reads

| Field | Used for |
|---|---|
| `customer.pending_documents[]` | Categories still owed: `id`, `code`, `title`, `description`, `document_types[]`. The verification page lists them; the wizard waits for one to disappear |
| `customer.documents[]` | History: `id`, `document_category`, `document_type`, `status_code`, `status_title`, `created_at`, `updated_at` |
| `document_types[].api` | Which provider component renders (section 3) |
| `document_types[].code`, `title`, `description`, `info`, `document_number_label`, `public_upload` | Shown on the document card. `title` and `description` are customer copy |
| `quote.pending_documents[]` | From the confirm `412`: `id`, `code`, `title`, `description`, `is_required`, `document_types[]`. Drives the wizard's verification step |
| `document_category.code` | `POI`, `POA`, `SOF` pick the explanatory paragraph; `POI` picks the photo upload |
| Sumsub `reviewResult.moderationComment` or `clientComment` | Shown to a refused customer verbatim |
| `412` body `type` and `message` on confirm | Sixteen types (section 8a). Eight route the wizard, the rest show `message` |

Two things the frontend never does: it never marks a document approved, and it never decides a category is complete. Both come from the profile.

## 5. Document statuses and what the customer sees

| `status_code` | Screen |
|---|---|
| `pending-verification`, `processing`, `review-required` | "We are checking your {document}. We will email you when it is done." |
| `approved` | Green card, date approved |
| `rejected` | Red card with a Start verification button to try again |
| anything else | Neutral card naming the document and its `status_title`, with a link to support |

The API's enum has a sixth value, `invalidated`, set when a compliance officer withdraws an approval. Until 10 September 2026 it reached the frontend and rendered an empty card beside a fresh request to upload the same document. The API now leaves withdrawn documents out of the list, and orders it newest-first, so the card shown for a category is the one the pending list ranked. Any new status still needs a frontend release first; the neutral card is there so a miss is visible rather than blank.

## 6. What the frontend listens to

Channel `client-customer.{customerId}`.

| Event | Payload keys read | What happens |
|---|---|---|
| `CustomerDocumentUploaded` | – | Profile refresh |
| `CustomerDocumentProcessing` | `category`, `document_type` | Refresh, toast "{category} - Received. We have received your {document_type}." |
| `CustomerDocumentApproved` | `category`, `document_type` | Refresh, toast "Accepted" |
| `CustomerDocumentRejected` | `category`, `document_type` | Refresh, toast "We couldn't accept your {document_type}. Open Account verification to see why and upload it again." |

`category` and `document_type` are printed to the customer as words, so send titles ("Proof of identity", "Passport"), not codes.

## 7. What the modal does with the provider

Every provider component emits the same five events, and the modal around it (`DocumentTypeItem`) reacts the same way whichever vendor is behind it.

| Event | Meaning | Modal reaction |
|---|---|---|
| `sdkInitialized` | The vendor UI is on screen | Spinner off |
| `sdkError` | The check could not start or broke | Message and a Try again, which remounts the provider and asks for a new token. The message is the API's own `message` when it wrote one for a customer, otherwise "We could not start your verification" |
| `sdkApplicantStatusChanged` | The vendor says the customer is done, and did not refuse | Modal closes, profile refreshes. The wizard then waits for the category to leave `pending_documents`; while it stays, the step says "Thanks, we have your {document}. We are checking it now." |
| `sdkApplicantRejected` | The vendor looked and said no (Sumsub `reviewStatus: completed` with `reviewAnswer: RED`) | "Refused" screen with the vendor's comment; not a retry prompt |
| `sdkCancelled` | The customer backed out | Modal closes, nothing else |

"Done" from a vendor is not "approved". The frontend treats it as "handed over" and lets the profile say the rest.

## 8a. The sixteen confirm refusals

`POST /quote/confirm` can answer `412` with any of these. The wizard routes the ones the customer can act on and shows `message` for the rest.

| `type` | What the wizard does |
|---|---|
| `account_verification_required` | Opens the verification step with `pending_documents` |
| `poi_info_check_failed` | Opens the identity-mismatch choice (section 8) |
| `incomplete_customer_address` | Opens the address step |
| `unverified_customer_mobile_number` | Sends the customer to onboarding, which verifies the number and returns them to the transfer |
| `incomplete_customer_identity` | Sends the customer to onboarding, which collects the identity details and returns them |
| `missing_recipient` | Returns to the choose-recipient step with the message |
| `wallet_subscription_required`, `wallet_terms_reacceptance_required` | Opens the wallet terms |
| `wallet_authorization_required`, `wallet_authorization_invalid` | Asks for the wallet code |
| `insufficient_wallet_balance` | Shows the shortfall and refreshes the balance |
| `duplicate_transaction`, `active_transfer_disable_rule`, `blocked_for_sending`, `payment_amount_collides`, `wallet_spending_on_hold` | Shows `message`; nothing the customer can do from here |

The token endpoint has two `412`s of its own, `incomplete_customer_identity` and `incomplete_customer_address`. The verification modal shows a "Complete your details" or "Add your address" button for those instead of "Try again".

## 8. The identity mismatch flow

If the name or date of birth on the ID differs from the profile, `POST /quote/confirm` answers `412 poi_info_check_failed`. The wizard shows two choices:

- Upload another document: fetches `document-categories`, adds the `POI` category back to the quote's pending list, and reopens the verification step.
- Use the details from my ID: `POST /apply-info-from-poi`, then the store is updated from the response and the wizard confirms again.

The frontend does not know which field differed. If the API can say, the wizard can show it.

## 9. Content security policy

Vendor SDKs are bundled from npm, so `script-src` lists no vendor hosts. Vendor UIs run in iframes or overlays, so `frame-src` does: `*.sumsub.com`, `*.shuftipro.com`, `*.uppass.io`, `*.withpersona.com`, `verify.didit.me`. The policy is report-only in production today.

A new provider that loads a script from its own host needs a `script-src` change. One that opens an iframe needs a `frame-src` change. One that redirects in the same tab needs neither. Say which in the handout.

## 10. Invariants the API must keep

1. `document_type.api` is one of `SUMSUB`, `SUMSUB-VIA-FINCODE`, `CYBRID`, `SHUFTI`, `UPPASS`, `DIDIT`, `SYSTEM`. Anything else renders an empty modal. Every client seeds only `SUMSUB` and `SYSTEM` today; `SUMSUB-VIA-FINCODE` is ahead of the API.
2. The token endpoint answers with the meaning in section 3 for that `api`, and answers again for a Sumsub refresh.
3. `return_url` is honoured for Shufti and Didit, unchanged. The customer lands back on the page they left.
4. `status_code` is one of the five in section 5. The API filters `invalidated` out; the frontend renders anything else as a neutral card so a miss is visible.
5. A category leaves `pending_documents` when nothing more is owed for it. That removal is the only completion signal the frontend uses.
6. `document_type.title`, `description`, `info` and `document_category.title`, `description` are customer copy and are printed as-is.
7. Vendor rejection comments passed through are customer-safe. The API cannot enforce this; a comment that reads like vendor jargon is something to send back so the provider is taken up or filtered.
8. `412` on confirm carries `type` from the sixteen in section 8a, plus `pending_documents` for `account_verification_required`. A new type shows `message` until the frontend routes it.
9. Broadcast payloads carry `category` and `document_type` as titles.
10. The presigned S3 URL accepts a `PUT` with only the file and its `Content-Type`; no cookies or headers of ours are sent.
11. The token response may carry `object_key` beside `token` for `SYSTEM`; when it does, that is the key the frontend sends in `pages`.

## 11. What to hand the frontend for a new provider

Fill this in before the frontend work starts.

| Item | Example / options |
|---|---|
| `document_type.api` code, exactly as the API sends it | `DIDIT` |
| Family | embedded SDK / hosted redirect same tab / hosted new tab / our own upload |
| What `token` is for this api, and its lifetime | "session id, valid 30 min" |
| For SDKs: the npm package and version, and what it needs at build time | `@didit-protocol/sdk-web@x.y` |
| For redirects: is `return_url` honoured, and what does the customer see at return | "yes; category is already processing" |
| Which categories this provider serves (`POI`, `POA`, `SOF`, other) | `POI` only |
| Does the vendor give a synchronous verdict, and how (event name, payload shape) | "yes: reviewAnswer GREEN/RED with a comment" |
| Typical time from "done" to `approved`, and does the customer get an email | "minutes; email on approved and rejected" |
| The five statuses: which can this provider produce | all |
| Refusal reasons the customer may see, in customer words | "The photo was blurry" |
| CSP: script host, iframe host, or neither | "iframe: https://*.example" |
| A staging document type wired to this api, and a way to force approved and rejected | – |
| Customer copy for the document card (`title`, `description`, `info`) | "Passport. A photo of the page with your picture." |

Write copy in words a customer would use: "ID check" not KYC, "checking" not under verification, "document" not artefact. The frontend keeps a vocabulary sheet and will otherwise rewrite it.

## 12. Things that went wrong before, so they are not repeated

- A token endpoint that answered 500 emitted nothing and left the modal spinner turning forever, on every provider. The token call is now caught and reported. It is still the most likely failure, so make it answer with a customer sentence.
- Sumsub's RED verdict fell through and emitted nothing, so a refused customer saw exactly what a hung SDK looks like. It now has its own event.
- The Shufti and UpPass "Cancel" button called the completion handler and navigated away as if the step were done. It is now "Not now" and only closes.
- Sumsub listeners were not torn down when the modal closed, so a later mount ran two. The instance is now module-scoped and destroyed on unmount.
- The single-photo upload had no catch on the token call and pulsed forever on the most common failure.
- The wizard said nothing after a document went to review; it now says the document is being checked and the transfer carries on from there.
- A withdrawn approval (`invalidated`) reached the frontend as a status with no screen, beside a fresh request for the same document. Fixed on the API on 10 September 2026; the frontend now renders unknown statuses rather than a blank card.
- Two confirm refusals and both token refusals that need the customer to finish their profile read as dead ends. They now lead to the screen that clears them.
