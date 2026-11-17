---
name: Bug report
about: Something in the customer app behaves incorrectly
title: ''
---

<!--
One or two sentences: what went wrong, described the way a customer would
describe it. Console errors go further down.
-->

## What happens

<!--
The actual behaviour. Quote any on-screen message exactly - a paraphrase is not
searchable. If the browser console showed anything, paste it verbatim.

"The button does nothing" is a real and common symptom in this app: several
error paths are swallowed and leave a control inert with nothing logged. Say so
rather than assuming you missed something.
-->

## What should happen

<!--
State this even when it seems obvious. It is often the only place the intended
behaviour is written down, and it is what the fix gets tested against.
-->

## Which brand and environment

<!--
Required. This repo is white-labelled by branch, so a bug is rarely "in the
app" - it is in a brand branch at a point in time.

  - brand (payvel, quiqsend, velox, pekepay, Tranxfa/staging, ...)
  - staging or production
  - the URL you were on
  - roughly when it was first seen

If it works on another brand, say which. That difference is usually the fastest
route to the cause, because brand branches diverge by dozens of commits.
-->

## How to reproduce

<!--
Numbered steps from a known starting point. Name the actual record - a
transaction number, a CRN, a corridor, the amount and currencies - rather than
"a transfer", so the same case can be looked at directly.

Say which step of the flow it dies at: calculator, add recipient, address,
account verification, confirm, payment, or after payment.

If it cannot be reproduced on demand, say so and give the conditions under which
it was seen. Intermittent is a fact about the bug, not a gap in the report.
-->

## Impact

<!--
Who is blocked and how badly - can the customer still send money, is money in
flight, is there a workaround, is a client waiting on it right now. This is what
decides whether it is picked up before the current ticket.
-->

## Notes

<!--
Optional. Network tab entries (which /client/v1 call and what it returned),
related tickets, anything already ruled out. Saying what was checked and found
innocent saves the next person repeating it.
-->
