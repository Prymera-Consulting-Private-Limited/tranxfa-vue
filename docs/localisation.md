# Localisation

Copy lives in `src/locales/*.json`, not in the templates. A brand that ships in
another language adds one file and sets one variable. It never edits a
component again.

## Why it works this way

It did not used to. Copy sat in the templates, so a brand translated by editing
them. That produced, on the one brand that needed it:

- 104 files of divergence from `main`, almost all of it copy, and a conflict on
  those same lines at every merge.
- 68 red tests on the brand branch, every one a copy assertion inherited from
  `main`, on the branch that actually ships.
- No way to enforce a glossary. A client asked for one word over another and
  six lines still disagreed a week later.
- Strings that a sweep cannot see. Dates rendered in English for months because
  they are produced at runtime, not written in a template.

## How it fits together

| Piece | What it does |
| ----- | ------------ |
| `src/i18n.js` | Loads every catalogue in `src/locales`, picks one by `VITE_APP_LOCALE`, falls back to English |
| `src/locales/en.json` | The source language. Nothing else is authoritative |
| `tests/setup.js` | Installs the plugin for every mounted component, so specs need not know |
| `tests/i18n-catalogue.spec.js` | The ratchet: per migrated file, every key must exist and no bare sentence may remain |
| `scripts/i18n-extract.py` | Moves a component's copy into the catalogue, leaving anything it cannot place confidently |

English is both source and fallback, so a half-translated brand reads in
English rather than showing raw keys. That matters: a missing translation must
never be a customer's problem.

## Using it in a component

```vue
<template>
  <h1>{{ $t('transfer.wizard.title') }}</h1>
  <p>{{ $t('transfer.wizard.documentReceived', {documentInReview}) }}</p>
  <input :placeholder="$t('common.emailPlaceholder')" />
</template>

<script setup>
import {useI18n} from "vue-i18n";
const {t} = useI18n();

failure.value = t('transfer.wizard.confirmFailed');
</script>
```

Templates get `$t` for free. Script code takes `t` from `useI18n()`.

## Adding a language

1. Copy `src/locales/en.json` to `src/locales/<code>.json` and translate the
   values, leaving the keys alone.
2. Set `VITE_APP_LOCALE=<code>` on that deployment.
3. Set the date locale too if the language needs it; see `src/main.js`.

Nothing else changes. No template is touched, so the brand branch stops
carrying copy and merges from `main` stop conflicting on it.

## Traps

- **A bare `@` in a message** is read as a link to another message and breaks
  compilation. Escape it: `"name{'@'}company.com"`.
- **Dates and numbers are not strings** and never appear in a sweep. They
  follow the locale set in `src/main.js`. A brand that forgets this renders
  "Thursday" beside its own language.
- **Text the back office sends** (transfer statuses, document categories,
  purposes, relationships) is not in the catalogue and cannot be. It is
  translated in the console, by whoever owns that environment.
- **Keys are generated, then read.** `scripts/i18n-extract.py` names a key from
  the first few words. Rename anything that reads badly before you commit; the
  guard does not care, humans do.

## Migrating another area

See the `translate-a-slice` skill in `.claude/skills/`, or `docs/workflow.md`
for the ticket and branch conventions around it.
