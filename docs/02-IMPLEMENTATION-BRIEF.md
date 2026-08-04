# Promotional Coupons — frontend implementation brief (SD-692)

For the customer app (tranxfa-vue). Hand this file **and** `01-API-CONTRACT.md`
to the session doing the work.

## Read this first

This brief was written from the backend side. The session that wrote it did
**not** have the frontend repository open, so it deliberately states *what* to
build and *why*, and leaves *where* to your existing conventions. Before
writing code, open the repo and answer these, then follow the house pattern
rather than anything invented here:

- Where does the quote live — Pinia store, composable, or component state?
  The coupon must live **in the same place as the quote**, never beside it.
- How are API calls wrapped (axios instance, interceptors, error normaliser)?
  The soft-fail rule below has to survive your interceptor.
- What are the existing input, button, spinner and inline-error components?
  Reuse them; the coupon field is not special enough to justify new ones.
- Is copy centralised in an i18n catalogue? Server reason strings are already
  localised and must be printed as-is, **not** run through the catalogue.

## The one rule that breaks everything if missed

`POST /quote/coupon/validate/{quote}` returns **HTTP 200** when the coupon is
unusable, with `is_valid: false` and a customer-facing `failure_reason`.

If your axios error interceptor or a generic `try/catch` treats that as a
failure, customers get "Something went wrong" instead of "This coupon has been
fully redeemed." Handle `is_valid` explicitly on the success path.

Apply is the mirror: **422** carries the same sentence in `message`. That one
*is* an error status, but it is still a normal, expected outcome to be shown
verbatim — not routed to a crash reporter.

## Interaction design

Put the coupon entry on the review/confirm step, after the quote exists and
before payment — a coupon needs a quote id, and the quote must be re-read
afterwards anyway.

**Collapsed by default.** A single "Have a promo code?" affordance. Most
customers do not have one and an always-open empty field invites hunting for
a code they do not have.

**States to build, in order of how often they occur:**

| State | What the customer sees |
|---|---|
| Idle | The collapsed link. |
| Entering | Text input (uppercase-friendly, trims whitespace), Apply button disabled while empty. |
| Checking | Button shows a spinner; input stays readable, not disabled — people re-read what they typed. |
| Rejected | Inline error under the field, verbatim `failure_reason`. Input keeps its value so they can correct a typo. |
| Applied | The field collapses into a summary row: code, `info_text`, and a Remove affordance. |
| Removed | Back to Idle, quote refreshed. |

**In the price breakdown** add exactly one line between sub-total and total,
shown only when `coupon` is non-null:

```
Sub-total            £105.00
Promo MERRYXMAS      -£5.00      <- coupon.discount_amount_currency_prefixed
Total                £100.00     <- total_amount_currency_prefixed, already net
```

For a **better-rate** coupon there is no discount line. Instead surface the
improvement where the rate is shown, using `coupon.exchange_rate_before_coupon`
against the quote's `exchange_rate`, and let the recipient amount speak for
itself — `foreign_amount*` is already recomputed.

`terms_text` belongs behind a small "Terms" disclosure next to the applied
coupon, not inline in the breakdown.

## Validate vs apply — pick one, deliberately

Two workable flows. **Recommended: apply directly.**

- *Apply directly* — one call, one round trip, quote comes back repriced. The
  422 gives you the rejection reason. Simplest, fewest states, no drift between
  a preview and the real thing.
- *Validate then apply* — use only if you want a preview before committing
  (e.g. a code arriving from a deep link that you want to check silently before
  showing anything). Costs a second round trip and can disagree with apply if
  the ceiling fills between the two calls, so treat the apply result as final
  regardless of what validate said.

Do not validate on every keystroke. It is a write-path call with usage
counting behind it; debounce is not enough — only fire on explicit submit.

## Non-negotiables for correctness

1. **Never compute the discounted total client-side.** Read
   `total_amount_currency_prefixed`. The server floors at zero, applies min/max
   clamps, and caps rate improvements at the market rate — none of which is
   reproducible in the client.
2. **After any quote mutation, re-read `coupon` from the response.** Changing
   the amount can silently drop the coupon (below a minimum, over a ceiling,
   corridor no longer eligible). If your UI keeps showing a promo line the
   server has removed, the customer will believe they are paying less than they
   are. This is the highest-severity bug available in this feature.
3. **Never branch on reason text.** Branch on `is_valid` and status only. The
   strings are operator-editable and localised.
4. **Do not persist the code across quotes.** A code valid for one corridor is
   not valid for another; re-applying silently on a new quote will produce
   confusing rejections.
5. **Guest quotes cannot take coupons.** If your flow allows quoting before
   sign-in, either hide the coupon entry until the customer is authenticated,
   or let the server's reason explain it — but do not show a coupon field that
   can only ever fail.

## Removing a coupon

`DELETE /client/v1/quote/coupon/{quote}` removes it and returns the quote at
its original pricing, exactly like apply returns it repriced. Handle the
response identically: replace the quote object, let the coupon row disappear
because `quote.coupon` is now null, never because a local flag was flipped.

It is a true undo. The redemption is released rather than recorded, so the
customer can re-apply the same code straight away and no per-customer limit or
cooling-off period counts the removed attempt against them. The copy should
match: "Remove", not "Remove (you will lose this offer)". No confirmation
dialog is warranted.

Render Remove only when `quote.coupon` is set, and expect the same treatment as
apply for failures — a 422 with a `message`, shown verbatim. A quote that has
already reached checkout answers 422 too, since a transacted quote does not
reprice; that should be unreachable from a live wizard, but do not crash on it.

Do not fake removal by hiding the coupon client-side. Only the server can
release the reservation.

## QA checklist

- [ ] Unusable code shows the server sentence, not a generic error.
- [ ] Applied coupon survives a page refresh (it is on the quote, not in local
  state).
- [ ] Changing the send amount after applying: breakdown and coupon line both
  update, and the line disappears if the server dropped the coupon.
- [ ] Better-rate coupon: no discount line, improved rate and recipient amount
  shown, "was" rate visible.
- [ ] A monetary coupon larger than the fee (with base `fee`) never renders a
  negative total.
- [ ] Applying a second code to a quote that already has one is handled.
- [ ] Remove restores the original total and clears the coupon row, and the
  same code can be applied again immediately afterwards.
- [ ] Slow network: button spinner, no double submission.
- [ ] Screen reader reads the rejection reason when it appears.
- [ ] Long `info_text` / `terms_text` and a long code do not break the layout.
- [ ] `info_text` and `terms_text` null: nothing renders where they would be.

## Definition of done

The customer can enter a code, see it accepted or rejected in plain language,
see exactly what it saved them, keep it across a refresh, and never see a promo
line that the server is not actually honouring.