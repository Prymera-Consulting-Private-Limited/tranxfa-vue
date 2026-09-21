import {describe, expect, it} from 'vitest';
import {existsSync, readFileSync} from 'node:fs';

// Xenvia's auth screens all use one background, public/images/backgrounds/bg.png,
// on production and here. main has its own artwork for the same screens
// (login.jpg, signup.jpg, resetpassword.png), which is Tranxfa's, and each
// promotion from main brings its views' references to those files with it. It
// happened on 16 September: the SD-1106 merge pointed the sign-in, sign-up,
// forgot-password, reset-password and onboarding screens at Tranxfa's images.
// Nothing failed - every file exists, the build was green - and the brand simply
// showed the wrong artwork, until someone compared it with production.
//
// This says what those screens use, so the next merge that swaps them fails here.
// It can only check the reference, never whether the picture is right: that is
// still a person looking at the page.
const AUTH_VIEWS = [
  'src/views/SignInView.vue',
  'src/views/SignUpView.vue',
  'src/views/ForgotPasswordView.vue',
  'src/views/ResetPasswordView.vue',
  'src/views/OnboardingWorkflowView.vue',
];

const BACKGROUND = '/images/backgrounds/bg.png';

const backgroundsIn = (file) => [...readFileSync(file, 'utf8').matchAll(/\/images\/backgrounds\/[A-Za-z0-9_.-]+/g)].map(match => match[0]);

describe("Xenvia's auth screens use its own background", () => {
  it.each(AUTH_VIEWS)('%s uses bg.png and nothing else', (file) => {
    expect(backgroundsIn(file)).toEqual([BACKGROUND]);
  });

  it('has the file on disk', () => {
    expect(existsSync(`public${BACKGROUND}`)).toBe(true);
  });

  // The five above are the ones that exist today. A sixth screen that took a
  // background would otherwise go unchecked, so anything under src that names one
  // is found rather than listed.
  it('finds every screen that names a background, so none goes unchecked', async () => {
    const {readdirSync} = await import('node:fs');
    const walk = (dir) => readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
      const path = `${dir}/${entry.name}`;

      return entry.isDirectory() ? walk(path) : (/\.(?:js|vue)$/.test(entry.name) ? [path] : []);
    });
    const naming = walk('src').filter(file => backgroundsIn(file).length > 0);

    expect(naming.sort()).toEqual([...AUTH_VIEWS].sort());
  });
});
