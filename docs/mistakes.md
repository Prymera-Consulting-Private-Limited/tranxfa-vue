# Process mistakes register

Every recorded pattern of mistake made while building this codebase, not in
it — a wrong assumption, a dangerous shortcut with a tool, a check skipped
under momentum. An entry here is a **caught pattern, not an accusation**:
mistakes happen in any fast-moving build, and this file is what turns one
into a rule instead of a repeat.

The practice comes from `console.remitso`, where the register has been running
since SD-1085. This is the frontend copy, seeded from the localisation work of
11–13 September 2026.

## Working rules

1. **A mistake is flagged the moment it is found**, by whoever finds it —
   not batched, not softened. State what happened plainly.
2. **The immediate instance is fixed in the same PR or session it is found
   in.** This register is never a substitute for the fix, only a record that
   stops the *pattern* recurring.
3. **The SOP must be concrete and checkable** — a step, a test, a naming
   convention, a specific habit. "Be more careful" is not an SOP and does not
   get an entry.
4. **The register is skimmed before a brand deploy**, because a brand push is
   a deploy and these are the mistakes that survive a green suite.
5. Entry ids (`PM-<n>`) are never reused.

Entry format: **What happened** · **Root cause** (the real mechanism, not a
character judgement) · **Cost or risk** · **SOP** (the concrete rule now in
force) · **Status** (`open` — SOP proposed, not yet proven; `adopted` — SOP
has held under a repeat opportunity; `superseded` — replaced by a sharper
rule, with the successor named).

---

## PM-001 — A guard reported nothing and was believed

**What happened:** `i18n-script-sweep.py` reported zero literals in both
repositories and the migration was called complete on that basis. Two of its
rules used `\s*` to mean "beside", and `\s*` crosses a newline, so
`return 'Sold out'` matched on the `n` of `return`. Every returned sentence in
every script block was invisible — which is how a computed label is written.
Corrected, the same sweep found 25 literals on tranxfa and 32 on payvel.

**Root cause:** a rule that rejects too much reports success. Nothing
distinguishes "found nothing because there is nothing" from "found nothing
because I cannot see it", and a green result reads the same either way.

**Cost or risk:** two repositories reported clean while full of English; the
claim was repeated to the user before it was tested.

**SOP:** when a check reports nothing, do not report that as a result until the
check has been proven able to fail — reintroduce the thing it catches, **in the
shape real code uses**. `return 'copy'` was the shape nobody tried. Copy the
file first, break it, watch it go red, restore from the copy, watch it go green.

**Status:** adopted — every guard added since has been proven to bite before
being trusted, and two of them failed that proof first time.

---

## PM-002 — A check verified the wrong property

**What happened:** the catalogue guard proved every key a component asks for
exists. It never proved the component could reach `t`. A sweep replaced literals
with `t(...)` calls and did not add `const {t} = useI18n()`, so four files per
repository threw `ReferenceError: t is not defined` — on the dashboard, the
transaction list, the wallet, the wallet statement, recipient cards, device
cards, the KYC toasts and sign-up. 1493 and 1815 tests stayed green over it.

**Root cause:** the guard answered a question adjacent to the one that mattered.
"The key exists" and "this renders" are different claims, and no spec rendered
the branches that threw.

**Cost or risk:** a crash on the most-visited screens in the app, shipped and
live, found by clicking a recipient rather than by any check.

**SOP:** when adding a guard, write down the property it proves in one sentence,
then ask what a customer could still hit that the sentence does not cover. If
the answer is "a crash", that is a second guard, not a footnote.

**Status:** adopted — `tests/i18n-catalogue.spec.js` now also asserts that every
`t(` call can reach a `t`, and that every catalogue compiles.

---

## PM-003 — A hand-written list silently under-covered

**What happened:** `tests/i18n-catalogue.spec.js` iterates a hand-written
`MIGRATED` array. `HotelAvailability.vue` and `HotelCancellationBadge.vue` were
never in it, so the guard passed while never looking at them. The copy in them
was found by correcting a sweep, not by the guard whose job it was.

**Root cause:** a list you type goes stale, and the test keeps passing while
covering less than it claims. Nothing in the test knows what it is not looking
at.

**Cost or risk:** a guard that reads as complete coverage and is not; the gap
grows silently with every new file.

**SOP:** give a hand-written list a **discovery arm** — a second assertion that
the list matches reality. See `.claude/skills/fitness-tests`.

**Status:** adopted — `MIGRATED` has both arms: nothing under `src/` may be
absent from it, and nothing in it may name a file that no longer exists. The
twenty-five components the first arm found were read and added; both arms were
proven to fail before being trusted.

---

## PM-004 — A bulk rename overwrote a key on an untouched screen

**What happened:** renaming auto-generated catalogue keys, `travel.starRating`
was chosen for a new message `{rating}-star`. A key of that name already existed
holding `Star rating`, a filter heading on a screen the ticket never touched.
The rename overwrote it.

**Root cause:** writing a key by name without checking the name was free. The
catalogue is one namespace shared by every screen.

**Cost or risk:** a wrong word on an unrelated screen, invisible in the diff of
the screen being worked on.

**SOP:** before writing a catalogue key by hand, assert the name is free. Where
several are renamed at once, check **every** target before writing **any** of
them, so a collision stops the batch instead of landing half of it.

**Status:** adopted — the payvel side of SD-1117 checks all targets first, and
the render check caught the tranxfa instance before it shipped.

---

## PM-005 — A pattern edit changed meaning and still parsed

**What happened:** porting SD-1074 to payvel, two ad-hoc pattern scripts edited
source instead of reading it. One tagged **every** route `PRODUCT.HOTELS`,
including the wallet routes, because it guessed the block from its first 200
characters. Another, a blanket `'] : []),' → ']),'`, closed the wrong array
spreads and left `/wallet/statement` outside its own array. Both were found by
reading the output afterwards.

**Root cause:** a pattern edit is fast and reviews as one line. A **wrong**
pattern edit reviews as one line too, and neither a build nor a test suite
distinguishes them: the first was valid code with the wrong meaning, the second
still parsed.

**Cost or risk:** silent semantic change across many files at once, in a diff
that looks small.

**SOP:** source files are read and edited one at a time. No `sed`, no `re.sub`,
no blanket `str.replace`, no scripted rewrite across a set of files. This is in
`CLAUDE.md` and it is why the eight Python tools were deleted (SD-1131).

**Status:** adopted — the rule is at repository level and the tooling that
encouraged the habit is gone.

---

## PM-006 — A finding was reported from a grep run against the wrong repository

**What happened:** the recipient-avatar defect was reported as affecting both
repositories, with `bg-yellow-500` and `bg-green-500` "missing from payvel's
built CSS". payvel never used those classes: it had a literal lookup map using
`bg-warning-500` and `bg-success-500`, which Tailwind could see. The grep had
run tranxfa's class names against payvel's stylesheet.

**Root cause:** a search for the names one repository uses, executed against the
other, returns zero and zero reads as confirmation.

**Cost or risk:** a confident, wrong statement in a ticket and to the user; a
fix proposed for a repository that did not have the defect.

**SOP:** when confirming a finding in the sibling repository, derive the search
terms from *that* repository's source, not from the first one's. A cross-repo
claim needs the same evidence twice, gathered twice.

**Status:** adopted — the correction is recorded in SD-1120's closing note and
in payvel's own pull request, rather than only being quietly fixed.

---

## PM-007 — A merged pull request was taken as proof the code was on main

**What happened:** three stacked pull requests were reported merged. Two of them
had been merged into their stack bases rather than into `main`, so the whole
stack sat on the bottom branch and payvel's `main` had none of it — while GitHub
showed two of the three as merged.

**Root cause:** merging a stack top-down lands each PR in the branch below it.
"Merged" is true of the pull request and says nothing about `main`.

**Cost or risk:** a ticket closed, and work reported as shipped, while `main`
did not have it.

**SOP:** after any merge, confirm the commit is on `main`:
`git merge-base --is-ancestor <sha> origin/main`. Never close a ticket on a
merged badge alone.

**Status:** adopted — every merge since has been checked this way, and it caught
a second instance the same day.

---

## PM-008 — A build was verified on a working tree the commit did not match

**What happened:** merging `main` into `quiqsend-staging` (PR #184, SD-1218)
brought in main's stock `login.jpg` and `signup.jpg`. The follow-up commit
`bef26ca` was meant to point `SignInView.vue` and `SignUpView.vue` at the
brand's `login.png` and `signup.png` and delete the JPEGs. Only the deletions
were committed. The commit message and the PR body both described the view
change, and the PR reported `npm run build` exit 0. Amplify then failed both
`quiqsend-staging` and `quiqsend_production` on
`Rollup failed to resolve import "/images/backgrounds/signup.jpg"` (SD-1239).

**Root cause:** the build and the suite ran in the working tree, which had the
edited views. The commit did not. A green check proves the files on disk, not
the commit that gets pushed, and a commit message describes what was intended
rather than what was staged.

**Cost or risk:** two Quiqsend deploys failed, and no fix could reach that
brand until this was repaired. Had the missing file been one Vite does not
resolve at build time, it would have shipped as a broken image with a green
build.

**SOP:** before opening a pull request into a brand branch:
1. `git status --short` is empty, so nothing verified is left out of the commit.
2. The build and `npm test` run on a clean checkout of the commit itself
   (`git worktree add --detach <dir> HEAD`, then `npm ci`), not in the tree it
   was made in.
3. For every asset the branch deletes, `git grep -n <path> HEAD -- src index.html`
   returns nothing.

**Status:** open — adopted for SD-1239's own fix, which was built and tested
from a clean export of the index.

---

## PM-009 — Advice was written around a backend message nobody had read

**What happened:** the transfer wizard appended "Change the amount and confirm
again." to the console's `payment_amount_collides` message (SD-1111, moved to
the catalogue by SD-1193). The console's message already ends "...or send a
slightly different amount.", so every customer who hit it was told the same
thing twice. SD-1251's first draft repeated the pattern for the new
`account_held` reason, appending "Pay or cancel that payment, or try again in
an hour" after a message that already says "Please pay or cancel it, or try
again in an hour." Both were green: the specs asserted our own invented
messages, never the console's.

**Root cause:** the advice was designed from the handout's description of the
refusal, not from the words the console actually sends. A spec written with a
made-up `message` can only prove our concatenation, never what the customer
reads.

**Cost or risk:** a duplicated instruction on the last screen before money
moves. It is harmless-looking, which is why it survived two tickets, and it
would have doubled again for every new reason.

**SOP:** before writing any copy that is shown next to a backend `message`:
1. Read the console's wording for every variant of that refusal
   (`git grep -n '<message key>' origin/develop -- lang`), in every language
   it ships.
2. Specs for that refusal use the console's wording verbatim, not a
   placeholder, so a duplicated sentence is visible in the assertion.
3. Default to showing the backend `message` alone. The app's own sentence is
   for a refusal that arrives without one.

**Status:** adopted — SD-1251 shows the console message alone and keeps its own
wording, chosen by `reason`, as the fallback. Its specs use the console's text.
