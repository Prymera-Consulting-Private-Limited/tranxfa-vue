---
name: rebrand-tenant
description: Create a new white-label brand branch, or re-skin an existing one — brand colours, logos, backgrounds, favicon, page title, analytics/chat tags and brand env vars. Use when onboarding a new client deployment, changing a brand's colours or logo, or auditing whether a branch is correctly themed.
---

# Creating or re-skinning a brand

This repo white-labels **by branch** (`docs/tenant-branches.md`). A re-skin
should be a small, self-contained diff — assets, brand variables, `index.html`,
and the logo references. `pekepay_staging` is the reference: 16 files, no logic
changes. Anything larger means brand-specific behaviour is leaking into a
branch that will later be painful to update.

Inspect the reference before starting:

```sh
scripts/branch-audit.sh pekepay_staging
```

## Creating a new brand branch

```sh
git fetch --all --prune
git switch -c <brand>_staging origin/main
```

Always branch from `origin/main`, never from another brand — you would inherit
their assets and copy, and every future port would conflict twice.

## 1. Brand colours

`src/assets/main.css`, inside `@layer theme { @theme { … } }`. Ten variables,
50→900. Either map a Tailwind palette or give raw hex:

```css
@theme {
    --default-font-family: 'Inter', sans-serif;

    --color-brand-50:  #FDECEC;
    --color-brand-100: #FAD2D2;
    --color-brand-200: #F6A6A6;
    --color-brand-300: #F17979;
    --color-brand-400: #EC5D5C;
    --color-brand-500: #E5403F; /* primary */
    --color-brand-600: #CC3837;
    --color-brand-700: #B3302F;
    --color-brand-800: #8F2625;
    --color-brand-900: #6B1D1C;
}
```

Define **all ten**. `brand-700` (primary buttons, header) and `brand-600`
(accents) carry the most weight, but `brand-50`/`brand-200` are used for
hover and selected states and look broken if left on the previous brand.

Also in this file: `--dp-primary-color` (datepicker) and
`--vs-dropdown-option--active-bg` (vue-select) reference `colors.brand.*`, and
the nprogress bar uses `colors.brand.500`. They inherit automatically — do not
hardcode them.

## 2. Images

Replace under `public/`:

| File | Used by |
| ---- | ------- |
| `images/logo.png` | every auth/onboarding screen (light backgrounds) |
| `images/logo-white.png` | the header, on the brand-coloured bar |
| `images/backgrounds/login.webp` | sign-in split panel |
| `images/backgrounds/signup.webp` | sign-up split panel |
| `images/backgrounds/resetpassword.png` | forgot/reset password |
| `favicon.ico` | browser tab |

Keep the filenames. The logo pair is read by `BrandLogo.vue` and the
backgrounds by five hardcoded paths, so renaming means editing markup and
guarantees a conflict on every future port. Those six files above are the
complete asset set - `logo-light.png` and `fav.svg` appear in some older brand
branches but are referenced by nothing on `main`.

Backgrounds are full-bleed and were historically committed as multi-megabyte
PNGs — `main` moved to `.webp` for this reason. Export new backgrounds as WebP
and keep them well under 500 KB.

## 3. Logo references

**Nothing to do here any more.** `src/components/BrandLogo.vue` owns the logo:
16 files render it, and `grep -rn "images/logo" src` returns nothing outside
that component. A brand replaces the two image files and changes no markup.

```vue
<BrandLogo variant="light" size="header" />   <!-- on the brand-coloured bar -->
<BrandLogo />                                  <!-- auth screens, on white -->
```

`variant` picks `logo.png` vs `logo-white.png`; `size` picks `max-w-64 max-h-10`
(auth) or `h-8 w-auto` (header). Spacing stays with the caller.

If the brand's aspect ratio needs a different size, **add a variant to
`BrandLogo.vue`** rather than overriding at a call site - a call-site override
re-creates exactly the per-brand diff this component removed. Note that adopting
`BrandLogo` on an older brand branch can *shrink* its logos, because several
brands had grown their own sizing inline (selamsend's header logo is `lg:h-20`,
against the component's `h-8`); check before taking `main`'s version wholesale.

The alt text comes from `VITE_APP_NAME`, falling back to `RemitSo`. Set that
variable and the accessible name is right everywhere at once. The only other
`RemitSo` strings left in `src/` are that fallback and the "Powered by RemitSo"
line in `Footer.vue` - decide deliberately whether the brand keeps the latter.

## 3a. Backgrounds - still hardcoded, and the live trap

Backgrounds did **not** get the `BrandLogo` treatment. Five `<img src>` paths
are still written out, with two different extensions:

| Path | Referenced by |
| ---- | ------------- |
| `/images/backgrounds/login.webp` | `SignInView.vue` |
| `/images/backgrounds/signup.webp` | `SignUpView.vue`, `OnboardingWorkflowView.vue` |
| `/images/backgrounds/resetpassword.png` | `ForgotPasswordView.vue`, `ResetPasswordView.vue` |

This is the single most common re-skin failure. A brand drops in `login.png`
and `signup.png` - which is what most brand branches carry, and what
`docs/tenant-branches.md` still lists - the view keeps asking for `.webp`,
and the customer silently sees the previous brand's background. Nothing errors
and the build is green.

So, when re-skinning:

```sh
# what the views ask for, versus what the brand actually shipped
grep -rn "images/backgrounds" src/
ls public/images/backgrounds/
```

Either export the brand's backgrounds as `.webp` under the existing names, or
change the five references to match the files. Do not leave the two disagreeing.

The alt text on these is wrong on main too - the signup and onboarding panels
both say `alt="Login Background"`. Fix it as you pass.

Making these read through a `BrandBackground` component, the way `BrandLogo`
did for the logo, is the next-highest-value cleanup in this repo: it would
remove five per-brand conflicts from four auth views.

## 4. `index.html`

Per-brand, and a routine conflict source:

- `<title>` — the brand name.
- `<link rel="icon">` — favicon path/type.
- Google Analytics `G-…` measurement ID.
- Microsoft Clarity project tag.
- Tawk.to chat widget src.
- `https://js.volumepay.io` — remove unless the brand uses Volume Payments.

**Remove the previous brand's analytics and chat tags.** Leaving them ships the
new brand's traffic to another client's dashboards.

## 5. Environment variables

Not committed — supply to the deployment, and record them wherever the team
keeps deploy config:

```dotenv
VITE_APP_NAME="Brand Name"
VITE_APP_URL=https://brand.example
VITE_APP_BASE_URL=https://api.brand.example
VITE_USER_AGREEMENT_URL=https://brand.example/terms
VITE_PRIVACY_POLICY_URL=https://brand.example/privacy
VITE_AUTH_CHANNEL=EMAIL              # or MOBILE_NUMBER / BOTH
VITE_THIRD_PARTY_SIGNUP_DECLARATION="…"       # only if the brand requires it
VITE_THIRD_PARTY_TRANSACTION_DECLARATION="…"  # only if the brand requires it
VITE_PUSHER_APP_KEY=…                # plus host/cluster/scheme
VITE_VOLUME_PAYMENT_MERCHANT_ID=…    # only for Volume Payments
```

The two declaration variables render a **required** consent checkbox on signup
and on transfer confirm when non-empty. Only set them when compliance asks.

## 6. Verify

```sh
npm install && npm run build && npm test
```

Then audit the theming:

```sh
# No hardcoded palette colours — everything must go through brand-*
git grep -nE '\b(purple|indigo|violet|sky|teal|fuchsia)-[0-9]{2,3}\b' -- src

# All ten brand variables present
grep -c "color-brand-" src/assets/main.css      # expect 10

# No stale references to the old brand
git grep -in "remitso\|<previous brand>" -- src index.html

# The diff is assets + theme only
git diff --stat origin/main
```

A hit in the first check is a real bug: that element will render the wrong
brand's colour. Convert it to `brand-*`.

Finally, look at the app: sign-in, sign-up, forgot-password, the header on a
signed-in page, and a primary button. Those five cover every asset and the
main brand colour.

## Checklist

- [ ] Branched from `origin/main`
- [ ] All ten `--color-brand-*` variables set
- [ ] Logo, light logo, both backgrounds, reset-password background, favicon replaced
- [ ] Background **extensions** match what the views ask for (`.webp` for login/signup, `.png` for resetpassword) - the silent-wrong-background trap
- [ ] Filenames unchanged; any logo resize done inside `BrandLogo.vue`, not at a call site
- [ ] `index.html`: title, favicon, **new** analytics/Clarity/chat tags, old ones removed
- [ ] Volume Payments script removed if unused
- [ ] `VITE_APP_NAME` set (drives every logo `alt`); `Footer.vue` "Powered by RemitSo" decided deliberately
- [ ] Brand env vars documented for the deployment
- [ ] `git grep` for hardcoded palette colours is clean
- [ ] Build + tests pass; five key screens eyeballed
