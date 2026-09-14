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
| `tests/i18n-catalogue.spec.js` | The ratchet, and now the whole of the enforcement: per migrated file, every key exists, no bare sentence remains, none hides in an expression or a script block or beside an interpolation, every `t()` can reach a `t`, every catalogue compiles and keeps the English placeholder names |
| `tests/tailwind-classes.spec.js` | No Tailwind class is assembled at runtime, which is how three avatar colours were never generated |

There is no tooling. Eight Python scripts used to sit here - an extractor, a
composer, a date rewriter, three sweeps, a scope check and a render check - and
they were deleted with SD-1131. Copy moves by hand, one file at a time; see
`CLAUDE.md` for why, and `.claude/skills/translate-a-slice` for how.

What the scripts detected did not go with them. It moved into the suite above,
where it runs on every change rather than when somebody remembers to run a
script - which is the stronger place for it, and where it should have been.

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

Two shapes look like a split sentence and are not, so read before you join:

- **A run that crosses a block boundary.** If it reaches a `<p>` or a `<div>`
  you are joining two sentences, not rebuilding one. Leave them separate.
- **A marker rather than a word.** The asterisk beside a required label, a
  decorative arrow, a middot: these hold no word and no value and are not part
  of the sentence. Leave them in the template.

## Proving nothing changed on screen

A migration must not change a single rendered word in English. There is no
script for this any more; read your own diff, file by file, and look at what
the template renders rather than at what the line says.

The defect to look for is the one no unit test sees: `Expiry date <span>`
renders with a space, `{{ $t('...') }}<span>` renders without one, and the
space was part of the sentence. It was the commonest mistake of the whole
migration - around twenty of them across the slices, four found in files that
had already shipped.

So wherever copy sat next to a styled element, check the space survived. If a
screen is worth the doubt, open it.

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

  Swap them by hand, one call at a time. A format sent to an API, such as
  `YYYY-MM-DD`, is not display and stays. A day and
  month without a year has no localised equivalent, so those stay too and are
  the ones to look at if a language needs a different order.
- **Text the back office sends** (transfer statuses, document categories,
  purposes, relationships) is not in the catalogue and cannot be. It is
  translated in the console, by whoever owns that environment.
- **Name a key for what it says**, not for its first few words - and check the
  name is free before you write it. A generated `travel.starRating` once
  overwrote an existing filter heading of the same name, on a screen that
  ticket never touched. The guard does not care; humans do, and so does the
  screen next door.
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
  is not a text node, so a reader scanning for `>text<` walks straight past it.
  The catalogue guard fails on these. When you read a file, read its
  expressions too - including the arguments of a `$t()` call, where an English
  default once rendered "Recipient Gets" in the middle of a Spanish
  calculator.

### A placeholder name is an identifier, not a word

The translator writes what the placeholder *means*, because that is what a
translator does with words:

```json
"recipient.methodInCountryForCurrency": "{payout method} en {country} para recibir {currency}"
```

Every one of those is wrong, and the two kinds fail differently.

**A name with a space does not compile.** vue-i18n throws
`Unterminated closing brace` while building the message, and the component
rendering it dies - the customer gets the error boundary, not a wrong word.
Five of these reached the Xenvia deploy; one crashed the recipient page and
another sat on the card payment screen.

**A renamed placeholder compiles and never resolves.** `{country}` where the
English says `{commonName}` leaves the literal text `{country}` on screen.

So a placeholder is copied, never translated. `tests/i18n-catalogue.spec.js`
holds two guards over every `src/locales/*.json`: one compiles every message
with vue-i18n's own compiler, one requires the placeholder names to match the
English. Neither reads the language, so both work for a locale nobody here
speaks - which is the point, because nobody here could have caught these by
reading.

### A word beside an interpolation

`Pay {{ amount }}` is one word of its own. The extractor skipped a text node
with fewer than three of its own words when an interpolation sat beside it, and
the guard skipped the same shape, so the button a customer presses to move their
money read English through the whole migration - along with
`Welcome {{ name }}`, `Upload {{ document }}` and `Payout in {{ country }}`.
42 nodes on tranxfa, 56 on payvel.

Word count was the wrong question. A message with a named placeholder can always
be reordered - `"Pay {amount}"` can become `"{amount} a pagar"`. What cannot be
reordered is a sentence spread across sibling elements, because each piece is
its own message. So the test is whether the node **opens or closes with a
connective** (`in`, `via`, `to`, `of`...), which means the sentence carries on in
the element next door; rebuild those as one `<i18n-t>`.

Two shapes need particular care, because keying them naively produces something
a translator cannot use:

- **A plural spelled with a ternary**, `night{{ n === 1 ? '' : 's' }}`. Keying it
  would hand a translator an `s` to place. Use vue-i18n pluralisation:
  `t('travel.nightCount', n, {count: n})` against `"{count} night | {count} nights"`.
- **A sentence built from template literals**, as the maintenance banner was.
  Write one whole message per case and choose between them in a computed.

### Copy inside a $t call's own arguments

```js
$t('calculator.recipientGets', {Recipient: recipient?.wholeName || 'Recipient'})
```

Both sweeps used to blank out a whole `$t(...)` call before scanning, so a
default *inside* one was invisible. On the Xenvia deploy this rendered
**"Recipient Gets"** in the middle of an otherwise Spanish calculator. They now
blank only the key argument and read the rest.

### A guard rule that rejects too much

`\s*` crosses a newline. Two rules in the script sweep and its guard used it to
mean "beside", and so rejected far more than they were written to reject:

```python
if re.search(r'[+\w)\]]\s*$', before):   # meant for  x + 'foo'
if re.match(r'\s*[+\w]', after[:12]):     # meant for  'foo' + x
```

`return 'Sold out'` matched the first rule on the `n` of `return`, so **every
returned sentence in every script block was invisible to both the sweep and the
guard**, which is how a computed label is usually written. The second rule did
the same job from the other side: a literal at the end of a line was skipped
whenever the next line happened to start with a word character. The sweep
reported zero literals and was believed.

A concatenation means a `+` beside the literal **on the same line**:

```python
if re.search(r'\+[ \t]*$', before):
if re.match(r'[ \t]*\+', after[:12]):
```

The lesson generalises: when a guard reports nothing, prove it can still fail.
Reintroduce the thing it is supposed to catch, in the shape real code uses.

## The four places copy hides

Each is invisible to a reader looking for the one before it, which is why every
one of them shipped English to a customer at some point. Read a file with all
four in mind:

1. **A text node or a known attribute** - `placeholder`, `title`, `alt`,
   `aria-label`, `label`.
2. **A sentence the markup split** around a link or a bold value. One
   `<i18n-t>`, not three keys.
3. **A literal inside a template expression**, `{{ ok ? 'Yes' : 'No' }}` -
   including inside a `$t()` call's own arguments.
4. **A literal in the script block**, rendered as data: the navigation labels,
   the failure fallbacks, a computed label, a returned sentence. Read **every**
   `<script>` block; a component written as `<script>` plus `<script setup>`
   has two.

A fifth thing has to hold, and for a while it did not: **a `t(...)` call is
only as good as the `t` the file can reach.** Replacing a literal and forgetting
the import leaves a `ReferenceError: t is not defined` on a branch that may go
unrendered for weeks - which is exactly what happened on the dashboard, the
wallet, sign-up and the KYC toasts. Add the import and the destructure *before*
you replace the literal, and
`tests/i18n-catalogue.spec.js` fails on the same condition. A component reaches
`t` through `const {t} = useI18n()`; a module reaches it through the instance
(see **Outside a component**). Run the scope check after every sweep, not only
after a migration slice: it costs nothing and it is the one guard that catches a
crash rather than a wrong word.

The catalogue guard covers all four. Each sweep knows what is not copy: a
Tailwind class list, an icon class, a date format, a media query, an enum, a
slug, an event name, a compound written as one word, a developer log line, a
value being compared against, a string being concatenated, a default for an
environment variable such as `import.meta.env.VITE_APP_NAME || 'Payvel'`, which
is configuration and not copy, and a default inside `defineProps`, which cannot
call `t()` because Vue hoists it above `setup()`.
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
