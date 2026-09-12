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
| `scripts/i18n-render-check.py` | Proves a migration changed no rendered English, by comparing the text each template renders before and after |
| `scripts/i18n-compose.py` | Puts a sentence the markup split back together as one `<i18n-t>` message with a slot per styled part |
| `scripts/i18n-expression-sweep.py` | Lists copy hiding inside a template expression, where a text sweep cannot see it |
| `scripts/i18n-script-sweep.py` | Lists copy in a component's script block: navigation labels, failure fallbacks, toasts |

English is both source and fallback, so a half-translated brand reads in
English rather than showing raw keys. That matters: a missing translation must
never be a customer's problem.

## Outside a component

A composable, the router or a store has no `useI18n()`. It reaches the same
catalogue through the global instance:

```js
import i18n from "@/i18n.js";

const t = (...args) => i18n.global.t(...args);

// a count chooses between the two forms, separated by | in the message
t('common.tooManyTriesSeconds', seconds, {count: seconds});
```

Route titles work this way too: a route names `meta.titleKey` and the
navigation guard resolves it, so the browser tab follows the brand's language.

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

## A sentence the markup splits

Markup often wraps one value of a sentence in its own element:

```vue
<p>Your <span class="font-semibold">{{ document.title }}</span> is under review.</p>
```

Three text nodes, so three keys, and a translator cannot reorder them. Use
vue-i18n's own component instead. One message, one slot per styled value:

```vue
<i18n-t keypath="verification.documentUnderVerification" tag="p" scope="global">
  <template #document><span class="font-semibold">{{ document.title }}</span></template>
</i18n-t>
```

with `"documentUnderVerification": "Your {document} is under review."`. The slot
keeps the styling, the message keeps the word order. `scope="global"` is needed
because the catalogue is global and the component has no local messages.

The tooling does this for you. `scripts/i18n-compose.py` finds runs of
adjacent keys separated by inline elements and rewrites each as one message.
It refuses a run it cannot rebuild safely, and says why:

- **crosses a block boundary** — the run reached a `<p>` or a `<div>`, so it
  is joining two sentences. Split them yourself.
- **a marker, not a word** — one of the elements holds no word and no value,
  such as the asterisk beside a required label. It is not part of the
  sentence.

## Proving nothing changed on screen

A migration must not change a single rendered word in English. Run:

```sh
python3 scripts/i18n-render-check.py HEAD <file> [file...]
```

It renders each template's text before and after, with tags removed and
whitespace collapsed, and prints every difference. Expect none. It exists
because of a defect no unit test sees: `Expiry date <span>` renders with a
space, `{{ $t('...') }}<span>` renders without one, and the space was part of
the sentence. Run it on the files from earlier slices too; it found four of
those spaces already lost.

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
- **A spelled-out date format is a decision that belongs to the language.**
  `MMM D, YYYY h:mm A` gives "septiembre 12, 2026 02:39 AM": the month
  translates, the order and the clock do not. Ask by meaning instead, with the
  formats each locale defines for itself, and Spanish reads "12 de septiembre
  de 2026, 2:39".

  | Ask for | English | Spanish |
  | --- | --- | --- |
  | `ll` | Sep 12, 2026 | 12 de sep. de 2026 |
  | `lll` | Sep 12, 2026 2:39 AM | 12 de sep. de 2026 2:39 |
  | `LLL` | September 12, 2026 2:39 AM | 12 de septiembre de 2026 2:39 |
  | `LT` | 2:39 AM | 2:39 |

  `scripts/i18n-date-formats.py` does the swap and lists what it kept. A format
  sent to an API, such as `YYYY-MM-DD`, is not display and stays. A day and
  month without a year has no localised equivalent, so those stay too and are
  the ones to look at if a language needs a different order.
- **Text the back office sends** (transfer statuses, document categories,
  purposes, relationships) is not in the catalogue and cannot be. It is
  translated in the console, by whoever owns that environment.
- **Keys are generated, then read.** `scripts/i18n-extract.py` names a key from
  the first few words. Rename anything that reads badly before you commit; the
  guard does not care, humans do.
- **A message that is only a placeholder is not copy.** `"{amount}"` as a
  catalogue entry sends a runtime value on a round trip through the translator's
  file, where it can be edited or broken. Leave the interpolation in the
  template.
- **A lost space is invisible to the suite.** See the render check above. It is
  the only thing that catches it.
- **The same sentence twice** with a straight and a curly apostrophe are two
  entries and two translations. Pick one and use the key in both places.
- **An HTML entity is markup.** `&rarr;`, `&mdash;`, `&middot;` inside a
  message are punctuation a translator has to carry and cannot see. Write the
  character, and keep a decorative arrow in the template.
- **An interpolation can contain `>`.** An arrow function inside `{{ }}` used
  to break the extractor's idea of where a text node ends. It now leaves any
  node whose braces do not balance; if you write one, check the result.
- **A literal inside an expression** (`{{ ok ? 'Yes' : 'No' }}`, `:aria-label="open ? 'Hide' : 'Show'"`)
  is not a text node, so no extractor will find it. The catalogue guard now
  fails on these, and `scripts/i18n-expression-sweep.py` lists them. It knows
  the difference between copy and a Tailwind class list, an icon class, a date
  format, an enum and a value being compared against.

## The four places copy hides

Each needed its own tool, because each is invisible to the one before:

1. **A text node or a known attribute.** `scripts/i18n-extract.py`.
2. **A sentence the markup split** around a link or a bold value.
   `scripts/i18n-compose.py`, rendered with `<i18n-t>`.
3. **A literal inside a template expression**, `{{ ok ? 'Yes' : 'No' }}`.
   `scripts/i18n-expression-sweep.py`.
4. **A literal in the script block**, rendered as data: the navigation labels,
   the failure fallbacks, a template literal with a value in it.
   `scripts/i18n-script-sweep.py`.

The catalogue guard covers all four. Each sweep knows what is not copy: a
Tailwind class list, an icon class, a date format, a media query, an enum, a
slug, an event name, a compound written as one word, a developer log line, a
value being compared against, a string being concatenated, and a default inside
`defineProps`, which cannot call `t()` because Vue hoists it above `setup()`.
Every one of those rules was paid for by a mistake this migration made.

## Where the migration stands

Every component in `src/` that holds copy now reads it from the catalogue, and
`tests/i18n-catalogue.spec.js` names all of them, so a new sentence in a
template fails the build. So do the modules that are not components: the
failure-message defaults, the upload rules, the verification-step labels and
the route titles. What stays outside the catalogue on purpose:

- Text the back office sends: transfer statuses, document categories,
  purposes, relationship names. Translated in the console.
- Dates, times and money, which follow the locale rather than a message.
- Provider SDK screens, such as a hosted KYC or card form, which are the
  provider's own copy.

## Migrating another area

See the `translate-a-slice` skill in `.claude/skills/`, or `docs/workflow.md`
for the ticket and branch conventions around it.
