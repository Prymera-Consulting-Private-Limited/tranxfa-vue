# Promotional Coupons — Client API contract (SD-692)

Reference for the customer-facing app. Every statement here is taken from the
shipped backend (`routes/api.php`, `QuoteCouponsController`,
`TransactionQuoteResource`, `PromotionCouponService`), not from a design doc.

Base path: the same `/client/v1` prefix and session auth the rest of the quote
endpoints use. All three endpoints require an authenticated customer session, and
the platform is taken from the session's app — the client never sends it.

---

## 1. Validate a coupon (preview, changes nothing)

```
POST /client/v1/quote/coupon/validate/{quote}
```

**Body**

```json
{ "coupon_code": "MERRYXMAS" }
```

`coupon_code` is required, string, max 255. Case does not matter — codes are
stored case-insensitively.

**Success — coupon usable (HTTP 200)**

```json
{
  "is_valid": true,
  "failure_reason": null,
  "discount_type": "monetary",
  "discount_base": "fee",
  "discount_amount": "5.00",
  "adjusted_exchange_rate": null,
  "info_text": "Get 5 GBP off your transfer fee this Christmas.",
  "terms_text": "One use per customer. Offer ends 31 December."
}
```

**Success — coupon NOT usable (also HTTP 200)**

```json
{
  "is_valid": false,
  "failure_reason": "This coupon has been fully redeemed."
}
```

> **This is the single most important rule of the whole integration.**
> An unusable coupon is a **200 with `is_valid: false`**, never a 4xx.
> Do not treat it as a request failure, do not log it as an error, do not show
> a generic "something went wrong". Show `failure_reason` verbatim — it is
> written for customers and already localised.

### Field notes

| Field | Meaning |
|---|---|
| `discount_type` | `monetary` (money off) or `better-rate` (improved FX rate). Decides which of the two fields below is populated. |
| `discount_base` | `fee` or `total-amount`. Only present for `monetary`; tells the customer *what* the money comes off. |
| `discount_amount` | Decimal **string** in the payment currency, e.g. `"5.00"`. `null` for a better-rate coupon. |
| `adjusted_exchange_rate` | The improved rate, as a string. `null` for a monetary coupon. |
| `info_text` / `terms_text` | Operator-authored customer copy. Either may be `null`. Render as plain text. |

Only ever one of `discount_amount` / `adjusted_exchange_rate` is non-null.

---

## 2. Apply a coupon (mutates the quote)

```
POST /client/v1/quote/coupon/{quote}
```

Same body. **Success returns the full repriced quote resource** — the same
shape your quote screen already renders, so replace your quote object wholesale
rather than patching fields.

**Failure (HTTP 422)**

```json
{ "message": "This coupon has been fully redeemed." }
```

The reason text is identical to what validate would have returned. So: 200 on
validate carries the reason in `failure_reason`; 422 on apply carries it in
`message`.

**404** means the quote does not belong to the signed-in customer. Treat it as
"quote not found", never as a coupon problem.

### The `coupon` block on the quote

Every quote response — from apply, and from your normal quote fetch/update —
carries a `coupon` key. It is `null` when no coupon is attached, otherwise:

```json
"coupon": {
  "code": "MERRYXMAS",
  "discount_type": "monetary",
  "info_text": "Get 5 GBP off your transfer fee this Christmas.",
  "terms_text": "One use per customer. Offer ends 31 December.",
  "discount_amount": "5.00",
  "discount_amount_currency_prefixed": "£5.00",
  "exchange_rate_before_coupon": null
}
```

- `discount_amount` / `discount_amount_currency_prefixed` are null for a
  better-rate coupon.
- `exchange_rate_before_coupon` is the **original** rate, present only for a
  better-rate coupon, so you can show "was 1.0500, now 1.0620". It is null for
  monetary coupons.

### How the totals move

The quote's own money fields already account for the coupon. Do **not**
subtract the discount yourself.

- `base_fees*` stays the **full, undiscounted** fee. A fee-based coupon does
  not rewrite it.
- `sub_total_amount_*` is amount + full fee, before any coupon.
- `total_amount_*` is the sub-total **minus** the discount, floored at zero.
  This is what the customer pays.
- `exchange_rate` is already the **improved** rate for a better-rate coupon;
  `foreign_amount*` is recomputed from it, so the recipient figure is correct
  with no work on your side.

So the receipt line-up is: sub-total, then a discount line sourced from
`coupon.discount_amount_currency_prefixed`, then total.

---

## 3. Remove a coupon (mutates the quote)

```
DELETE /client/v1/quote/coupon/{quote}
```

No body. **Success returns the full quote resource** at its original pricing,
with `coupon` back to `null` — same handling as apply, replace the quote object
wholesale.

**Failure (HTTP 422)**

```json
{ "message": "There is no coupon on this quote to remove." }
```

Two cases produce it: nothing is applied, or the quote already reached checkout
and its coupon is final. Both are safe to show as-is, though the first should
not be reachable if you only render Remove when `quote.coupon` is set.

**404**, as with apply, means the quote is not the signed-in customer's.

Removal releases the redemption completely — the usage row is deleted, not
marked spent. The customer can re-apply the same code immediately, and a
per-customer limit or cooling-off period will not hold the removed attempt
against them. So the UI can treat Remove as a genuine undo, with no warning
copy about wasting a use.

---

## 4. Lifecycle rules the client must respect

1. **Re-read `coupon` after every quote change.** Changing the amount or the
   corridor re-evaluates the coupon server-side; it is recomputed, or silently
   removed if it no longer applies. Never cache "a coupon is applied" in local
   state — the quote response is the truth, every time.
2. **A coupon is held, not spent.** Applying reserves it against the quote and
   the reservation expires with the quote (24h by default,
   `PROMOTION_COUPON_QUOTE_TTL`). It is only truly consumed when the
   transaction is created at checkout.
3. **A customer account is required.** An anonymous/guest quote can never take
   a coupon; the reason text will say so.
4. **One coupon per quote.** There is no stacking. Applying a second code to a
   quote that already has one fails with a reason.
5. **The final transaction carries the discount** as `coupon_discount_amount`
   (and its `_currency_prefixed` sibling) so receipts and history can show it
   after checkout.

## 5. Reason strings you will see

These come back verbatim; do not re-map or re-word them. Listed so you can
design for the tone and length, not so you can match on them — **never branch
on the text**, only on `is_valid` / the status code.

- "This coupon is not currently active."
- "This coupon is not applicable for this transfer."
- "This coupon has been fully redeemed."
- "You have already used this coupon the maximum number of times."
- "This coupon cannot be used again yet." (cooling-off between repeat uses)
- "This coupon is not available for your currency."
- "Your transfer is below the minimum amount for this coupon."
- "A customer account is required to use a coupon."