---
name: translate-a-slice
description: Move one area's copy out of the templates into src/locales/en.json, using scripts/i18n-extract.py and the catalogue guard. Use when asked to "migrate the next slice", "move this screen to i18n", "translate a component", "add a language", or when a new component is written and its copy needs to go in the catalogue rather than the markup.
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

```sh
# dry run first: prints the files and how many keys it would add
python3 scripts/i18n-extract.py . transfer.wizard src/views/Transfer/IndexView.vue

# then apply
python3 scripts/i18n-extract.py . transfer.wizard src/views/Transfer/IndexView.vue --apply
```

The script handles whole text nodes, the text attributes, and text nodes with
interpolations in them (`Thanks, we have your {{ x }}` becomes a message with a
named parameter). It touches only the template block. Everything else it leaves
and reports, which is the part you do by hand:

- **String literals in `<script setup>`** — failure messages, computed labels.
  Add `import {useI18n} from "vue-i18n";` and `const {t} = useI18n();`, then
  replace the literal with `t('key')`.
- **Sentences split across tags**, where a link or a bold value sits
  mid-sentence. Run `python3 scripts/i18n-compose.py . <prefix> <files>`
  first: it rewrites the runs it can rebuild safely and tells you which ones
  it left, with the reason. The rest are yours. Do not leave these as three keys: a translator cannot reorder
  them and the spaces between them are gone. Use `<i18n-t keypath="..." tag="p"
  scope="global">` with one `<template #name>` per styled part, and one message
  holding `{name}`. `docs/localisation.md` has the shape.
- **Keys whose message is only a placeholder** (`"{amount}"`). The script no
  longer makes them, but earlier slices did. Put the interpolation back in the
  template and delete the key.
- **Anything with an `@` in it.** Escape as `{'@'}` or message compilation
  fails at render, not at build.

Check the messages for HTML entities as well (`&rarr;`, `&mdash;`,
`&middot;`): those are markup, so write the character, and keep a decorative
arrow in the template rather than in the message.

Then read the generated keys and rename the ones that read badly. Check the
name is not already used elsewhere in the catalogue before you write it by
hand; one collision silently changed a screen the slice never touched. The script
names from the first few words, which gives `thanksWeHaveYourDocumentinreview`
where `documentReceived` was meant.

## Finish the slice

1. Add every migrated file to `MIGRATED` in `tests/i18n-catalogue.spec.js`.
   The guard then requires that each key exists and that the file spells out no
   sentence of its own. Run it; it will find what you missed.
2. `python3 scripts/i18n-render-check.py HEAD <the files>`. It must print no
   differences: the English on screen has to be identical, down to the spaces
   between a label and the element beside it. Every difference it prints is a
   defect you introduced, except one you meant to fix, and then say so in the
   pull request.
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
