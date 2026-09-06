# <Title>

<!--
One or two paragraphs: what this changes, and the problem it solves stated the
way a customer or an operator would describe it - not the way the code
describes it. If the old behaviour was broken or unusable, say how.

Prefix the title with the ticket (SD-XXX) when there is one.

Base is main. Never open an ordinary PR against staging or a brand branch -
staging is the Tranxfa brand branch, not an integration branch. See
docs/tenant-branches.md.
-->

## What changed

<!--
Grouped by area, most significant first. Lead each group with the decision, not
the file list - the diff already lists files.

Call out anything a reviewer would otherwise have to work out: a backend
contract this depends on, a component that had to move, an ordering that
matters.
-->

## Brand impact

<!--
Required. This repo is white-labelled by branch, so every change has a fleet
answer. State which:

  - all brands, once this reaches their branch
  - a subset, behind an env var or backend flag
  - one brand only (and then say why it is not configuration)

If this touches any of the known conflict surface - src/assets/main.css,
public/images/*, index.html, Header.vue, the auth views - say how a brand
branch should resolve it when the change is ported.

Write "None - internal only" for tooling, tests or docs.
-->

## Backend contract

<!--
Which /client/v1 endpoints this relies on, and whether any of them changed.

If the backend changed shape for this, link the console PR and say whether the
API Documentation page (console -> API Documentation) was updated. A frontend
PR that depends on an undocumented or unshipped backend change should say so
plainly and stay unmerged until it lands.

Write "None" if this touches no API call.
-->

## Testing

<!--
What you ran, then the tests worth reviewing and why. `npm test` counts alone
are not evidence.

If you added or refreshed anything under tests/fixtures/, say what the
re-capture changed in SHAPE - renamed or vanished fields - and ignore the
identifier churn.

Name any test that characterises existing behaviour from before the change:
that is the evidence a refactor preserved it.
-->

## Deploy

<!--
Required whenever this needs anything beyond a normal Amplify build.

Things that belong here: a new or renamed environment variable (and which
Amplify apps need it set BEFORE this merges), a change to the build spec, a new
asset that must exist per brand, anything needing a specific ordering against a
backend release.

An env var this code reads but an Amplify app does not define fails at runtime
as undefined, not at build time - so name it here explicitly.

Write "None" if there is genuinely nothing.
-->

## Out of scope and follow-ups

<!--
State plainly what was deliberately not done, and why. A reviewer should never
have to wonder whether something was missed or excluded.

If this takes a deliberate shortcut, say so here rather than letting it be
found later.
-->

## Reviewing

<!--
Optional. Where to start, and any commit that carries context the diff does not.
-->
