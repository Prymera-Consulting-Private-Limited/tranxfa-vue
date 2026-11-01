---
name: Feature request
about: A change or addition to what the customer app can do
title: ''
---

<!--
One or two paragraphs: what should be possible that is not possible today, and
who needs it. Describe the outcome, not the screen - how it is built is the
implementation's decision.
-->

## Who is this for

<!--
Required, and it is the first question the work is judged against.

  - every brand, as standard behaviour
  - a subset of brands, switched on per brand
  - one brand asking for it

This changes the design, not just the priority. This repo white-labels by
branch, so "one brand only" has a real cost: it either lives forever as a
divergent commit on that brand, or it becomes configuration. Anything expected
to reach other brands later belongs on main behind an env var or a backend
flag from the start.
-->

## The problem today

<!--
What customers or support actually do instead. A manual workaround, a support
request every time, an abandoned transfer - say which. If something exists but
is unusable, say what is wrong with it rather than asking for a replacement
outright.
-->

## What good looks like

<!--
The behaviour once this is done, in the customer's terms. Concrete beats
complete: one worked example of the thing succeeding is worth more than an
exhaustive list of requirements.
-->

## Backend support

<!--
Does the API already provide this?

Check the console's API Documentation page before assuming it does not - the
backend exposes considerably more than this app currently uses (biometric
login, PIN, address autocomplete, exchange-rate alerts, account closure).

If it needs new backend work, link that ticket. A frontend ticket that silently
depends on unbuilt backend work will stall.
-->

## Constraints

<!--
Anything that limits the answer - a regulatory requirement, a provider's
behaviour, a deadline tied to a client go-live, behaviour that has to keep
working as it does now.

Also state what must not change. That is usually the harder constraint.
-->

## Out of scope

<!--
Optional but useful. What this deliberately does not cover, so the work does not
quietly grow into it.
-->
