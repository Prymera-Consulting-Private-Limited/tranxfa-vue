import {describe, expect, it} from 'vitest';
import {readdirSync, readFileSync} from 'node:fs';

// SD-1744. The auth screens split the page into a brand image and a form, and
// the row holding them was h-screen: exactly one window tall. The forms centre
// themselves in that row, so one taller than the window - the onboarding country
// grid on a laptop at 150% display scaling, about 1280x580 - overflowed above the
// top, where nothing can scroll to it, and the image ended a window down the
// page. Xenvia's client could only see the whole screen at 33% zoom.
//
// The row now grows with its content, and the image stays one window tall and
// pinned while the form scrolls. This holds that for every such screen. It reads
// the markup, so it cannot say the page looks right: that is still a browser at
// a short window, and a phone.
const AUTH_VIEWS = [
  'src/views/SignInView.vue',
  'src/views/SignUpView.vue',
  'src/views/ForgotPasswordView.vue',
  'src/views/ResetPasswordView.vue',
  'src/views/OnboardingWorkflowView.vue',
];

const BACKGROUND = /\/images\/backgrounds\//;

const sourceFiles = (dir) => readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
  const path = `${dir}/${entry.name}`;
  if (entry.isDirectory()) return sourceFiles(path);
  return /\.(?:js|vue)$/.test(entry.name) ? [path] : [];
});

// The static class list of every opening tag that matches. `:class` bindings are
// not read; none of these tags has one.
const classesOf = (file, pattern) => [...readFileSync(file, 'utf8').matchAll(/<[a-z][^>]*>/g)]
  .map(match => match[0])
  .filter(tag => pattern.test(tag))
  .map(tag => (tag.match(/\sclass="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean));

describe('auth screens grow with their content', () => {
  it.each(AUTH_VIEWS)('%s: the split row is at least one window tall, not exactly one', (file) => {
    const rows = classesOf(file, /md:flex-row/);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain('min-h-screen');
    expect(rows[0]).not.toContain('h-screen');
  });

  it.each(AUTH_VIEWS)('%s: the background stays one window tall and pinned', (file) => {
    const images = classesOf(file, BACKGROUND);

    expect(images).toHaveLength(1);
    expect(images[0]).toEqual(expect.arrayContaining(['md:sticky', 'md:top-0', 'md:h-screen']));
  });

  // A screen is in this layout when it names a background. A sixth one would
  // otherwise go unchecked, so they are found rather than listed.
  it('finds every screen with a background, so none goes unchecked', () => {
    const found = sourceFiles('src').filter(file => BACKGROUND.test(readFileSync(file, 'utf8')));

    expect(found.sort()).toEqual([...AUTH_VIEWS].sort());
  });
});
