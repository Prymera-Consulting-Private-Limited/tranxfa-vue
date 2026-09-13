---
name: translate-a-slice
description: Move one area's copy out of the templates into src/locales/en.json, one file at a time by hand, checked by the catalogue guard. Use when asked to "migrate the next slice", "move this screen to i18n", "translate a component", "add a language", or when a new component is written and its copy needs to go in the catalogue rather than the markup.
---

# Migrating a slice of copy

Copy belongs in `src/locales`, not in a template. `docs/localisation.md`
explains the model; this is how to move the next area into it.

Work one area per pull request. A slice is a screen and the components only it
uses, roughly 5 to 30 files. Larger than that and nobody reads the diff.

## Before you start

Ticket first, branch `feature/sd-<n>-i18n-slice-<k>` from `main`
(`docs/workflow.md`). Then know two things:

1. **Which files.** List them before touching anything, and say the count in
   the ticket. It is the only honest measure of progress.
2. **Which key prefix.** One per area, mirroring where the customer is:
   `transfer.wizard`, `payment.card`, `recipients`, `verification`. Strings
   used by three or more areas go in `common`.

## Procedure

**Open one file. Move its copy. Open the next one.** There is no script for
this and there is not going to be one: the eight that existed were deleted with
SD-1131, because a pattern that rewrites thirty files reviews as one line
whether it is right or wrong. See `CLAUDE.md`.

Work through a file top to bottom and move every one of these:

- **Whole text nodes and the text attributes** (`placeholder`, `title`, `alt`,
  `aria-label`, `label`). `<p>Send money</p>` becomes
  `<p>{{ $t('transfer.wizard.sendMoney') }}</p>`.
- **A text node with an interpolation in it.** `Thanks, we have your {{ x }}`
  becomes one message with a named parameter, not two keys around a hole.
  **A single word counts**: `Pay {{ amount }}` is the button a customer presses
  to move their money, and it read English through the whole migration because
  a rule exempted it.
- **String literals in `<script setup>`** — failure messages, computed labels,
  navigation names. Add `import {useI18n} from "vue-i18n";` and
  `const {t} = useI18n();` **before** you replace the literal, not after.
  Forgetting them fails neither the build nor the suite; it leaves
  `ReferenceError: t is not defined` on a branch that may go unrendered for
  weeks.
- **Literals inside a template expression**, including inside a `$t()` call's
  own arguments: `$t('k', {name: x || 'Recipient'})` renders "Recipient" in
  the middle of an otherwise translated screen.
- **Sentences split across tags**, where a link or a bold value sits
  mid-sentence. Do not leave these as three keys - a translator cannot reorder
  them and the spaces between them are gone. Use `<i18n-t keypath="..." tag="p"
  scope="global">` with one `<template #name>` per styled part, and one message
  holding `{name}`. `docs/localisation.md` has the shape.
- **A plural spelled with a ternary**, `night{{ n === 1 ? '' : 's' }}`. Use
  vue-i18n pluralisation: `t('travel.nightCount', n, {count: n})` against
  `"{count} night | {count} nights"`. Handing a translator an `s` to place is
  meaningless in a language that pluralises differently.

What is **not** copy, and stays where it is: a Tailwind class list, an icon
class, a date format, a media query, an enum or slug, an event name, an
analytics event name (`fbq('track', 'Purchase')` - translating it stops the
conversion being counted), a developer log line, a value being compared
against, and a default for an environment variable.

Two more per-message rules: **anything with an `@`** is escaped as `{'@'}` or
message compilation fails at render rather than at build; and an **HTML entity**
(`&rarr;`, `&mdash;`, `&middot;`) is markup, so write the character and keep a
decorative arrow in the template rather than in the message.

Name each key for what it says, not for its first few words. **Check the name is
free before you write it** - one collision silently changed a screen the slice
never touched.

## Finish the slice

1. Add every migrated file to `MIGRATED` in `tests/i18n-catalogue.spec.js`.
   The guard then requires that each key exists and that the file spells out no
   sentence of its own. Run it; it will find what you missed.
2. **Read your own diff, file by file.** The English on screen has to be
   identical, down to the spaces between a label and the element beside it -
   a lost space where copy sat next to a styled span was the commonest defect
   of this whole migration. Any difference is one you introduced, except one
   you meant, and then say so in the pull request.
3. `npm run build` and `npx vitest run`.
4. Existing specs that assert the English will fail. That is the point: move
   each one to read the catalogue (`expect(en.transfer.wizard.x).toBe(...)`)
   and assert the key in the source. Do not weaken the assertion.
5. If the area belongs to a brand that already ships in another language, add
   the same keys to that catalogue in the same pull request, or the screen
   silently falls back to English.

## What not to do

- Do not migrate a file halfway and add it to the guard list. It will pass
  today and fail on the next person's unrelated change.
- Do not put a key in `common` because two screens happen to share a word. A
  shared key means the two can never diverge; that is a decision, not a saving.
- Do not translate text the back office sends. Statuses, document categories,
  purposes and relationship names come from the console and are translated
  there. See `docs/localisation.md`.
