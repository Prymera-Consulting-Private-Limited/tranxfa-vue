---
name: fitness-tests
description: The house practice of writing a test that fails when future work forgets a rule — what the existing ones guard, the requirement to prove one fails before trusting it, giving a hand-written list a discovery arm so it cannot silently under-cover, and saying in the test what it cannot judge. Consult when a change establishes a convention that later work could quietly break, when a ruling needs enforcing rather than documenting, or before adding to i18n-catalogue.spec.js, tailwind-classes.spec.js or any other guard spec.
---

# Fitness tests

A fitness test asserts a **property of the codebase** rather than the behaviour
of one component. It exists so that work six months from now fails loudly
instead of quietly breaking a rule nobody remembers.

Write one whenever a change establishes a convention the compiler cannot see. A
comment says what should happen; a fitness test makes it so.

The practice comes from `console.remitso`. The mistakes that shaped this file
are in `docs/mistakes.md`.

## The ones that exist

| Test | Guards |
|---|---|
| `i18n-catalogue.spec.js` → the migrated files | every key a migrated file asks for exists; no bare sentence remains in it |
| → copy in an expression | `{{ ok ? 'Yes' : 'No' }}` and bound attributes, including the arguments of a `$t()` call |
| → copy in a script block | navigation labels, failure fallbacks, computed labels, returned sentences |
| → a word beside an interpolation | `Pay {{ amount }}`, `Welcome {{ name }}` |
| → every `t()` call can reach a `t` | a `t(` with no `useI18n()` and no module-level `t` |
| → every locale compiles | vue-i18n's own compiler, over every `src/locales/*.json` |
| → placeholder names match the English | `{country}` where the English says `{commonName}` never resolves |
| `tailwind-classes.spec.js` | no Tailwind class is assembled at runtime |
| `settings-dialogs.spec.js` | every dialog has a title and a button that clears its own flag |
| `licensed-products.spec.js` | what the app offers when service status cannot be reached |
| `feature-flags.spec.js` | the product flags stay deleted |

## Prove it fails. Always.

**A guard that has never failed is a guard you have not tested.** Break the
thing deliberately, watch it go red, restore, watch it go green. Every arm, not
just the first.

This is not ceremony. It is the single most valuable habit in this repository,
and it has caught a bad guard nearly every time it was applied:

- The script sweep reported zero literals in two repositories that were full of
  them. Its rule let `\s*` cross a newline, so `return 'Sold out'` matched on
  the `n` of `return`.
- The first analytics-event rule required a literal `fbq(` and missed
  `fbq?.(` — the probe showed both event names still flagged.
- The first Tailwind guard flagged a *comment* that named the pattern it forbids.

Break it in the shape real code uses. `return 'copy'` is the shape nobody tried
for months.

Restoring after the break has a trap of its own: `git checkout -- <file>`
restores to `HEAD`, discarding every real uncommitted change in that file
alongside your deliberate break. Copy the file first:

```bash
cp src/components/Footer.vue /tmp/Footer.bak
# break it, run the spec, watch it fail
cp /tmp/Footer.bak src/components/Footer.vue
# run it again and confirm green before moving on
```

## Give a hand-written list a discovery arm

Most of these tests iterate a list somebody typed. That list will go stale, and
the test will keep passing while covering less than it claims.

`MIGRATED` in `i18n-catalogue.spec.js` is the live example: two files were
missing from it for weeks, so the guard never looked at them, and the copy in
them was found by correcting a sweep instead.

So add a second assertion that the list matches reality:

```js
// every .vue file under src/ is either in MIGRATED or in a named,
// justified exclusion list — never simply absent
const known = new Set([...MIGRATED, ...NOT_YET_MIGRATED]);
const unaccounted = sourceFiles('src').filter(f => f.endsWith('.vue') && !known.has(f));

expect(unaccounted, 'a component that is in neither list is a component nobody is checking').toEqual([]);
```

Without that arm, adding a component leaves the guard passing over the ones it
already knew.

## Pair by hand when the names do not match

Resist deriving a list by naming convention. A convention-derived list skips
exactly the file most likely to be forgotten — the one that was named
differently because it was special. A hand-written list plus a discovery arm
beats a clever derivation.

## Say what the test cannot judge, in the test

A guard has edges. Write them where the next person will read them, not in a
pull request they will never open.

`settings-dialogs.spec.js` asserts the markup of a dialog and says plainly, in
the file, that a jsdom harness would not reproduce the live dismissal behaviour
in either direction, so it is not there — and that the close button was chosen
as the fix precisely because it needs none of that machinery.

A test that lies in both directions is worse than no test. Say so in the file
and move the assertion somewhere honest.

## Where they live

Beside the other specs in `tests/`, run by the same `npx vitest run`. There is
no separate suite and no separate command: a guard nobody runs is a comment.
