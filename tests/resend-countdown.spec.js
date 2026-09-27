import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {defineComponent, h} from 'vue';
import {mount} from '@vue/test-utils';
import {useResendCountdown} from '@/composables/resend_countdown.js';

// SD-1072: the resend countdown used to subtract one per tick and race a
// timeout of the same length. On Safari the ticks lost, so the Resend link
// never appeared and the number carried on below zero.

let timer = null;

const Host = defineComponent({
  setup() {
    timer = useResendCountdown(30, 250);
    timer.start();

    return () => h('span', 'countdown');
  },
});

const read = f => readFileSync(f, 'utf8');

describe('useResendCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-12T00:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    timer = null;
  });

  it('counts down against the clock and releases the link at zero', () => {
    const wrapper = mount(Host);
    expect(timer.countdown.value).toBe(30);
    expect(timer.showResendButton.value).toBe(false);

    vi.advanceTimersByTime(10_000);
    expect(timer.countdown.value).toBe(20);
    expect(timer.showResendButton.value).toBe(false);

    vi.advanceTimersByTime(20_000);
    expect(timer.countdown.value).toBe(0);
    expect(timer.showResendButton.value).toBe(true);
    wrapper.unmount();
  });

  // The Safari case: ticks arrive late, so a countdown that trusted them never
  // hit its exact zero and never released the link.
  it('finishes even when every tick arrives late', () => {
    const wrapper = mount(Host);
    // One late wake-up covering the whole window, as a throttled tab gives.
    vi.advanceTimersByTime(45_000);
    expect(timer.countdown.value).toBe(0);
    expect(timer.showResendButton.value).toBe(true);
    wrapper.unmount();
  });

  it('never shows a negative number', () => {
    const wrapper = mount(Host);
    vi.advanceTimersByTime(90_000);
    expect(timer.countdown.value).toBe(0);
    wrapper.unmount();
  });

  it('restarting sets the full wait again', () => {
    const wrapper = mount(Host);
    vi.advanceTimersByTime(31_000);
    expect(timer.showResendButton.value).toBe(true);

    timer.start();
    expect(timer.countdown.value).toBe(30);
    expect(timer.showResendButton.value).toBe(false);

    vi.advanceTimersByTime(31_000);
    expect(timer.showResendButton.value).toBe(true);
    wrapper.unmount();
  });

  it('stops its interval when the component goes away', () => {
    const clear = vi.spyOn(globalThis, 'clearInterval');
    const wrapper = mount(Host);
    vi.advanceTimersByTime(1_000);
    wrapper.unmount();
    expect(clear).toHaveBeenCalled();
    clear.mockRestore();
  });
});

describe('every resend screen uses it', () => {
  it.each([
    'src/views/MultifactorAuthenticationView.vue',
    'src/views/AuthByOtp.vue',
    'src/components/Customer/EmailVerification.vue',
    'src/components/Customer/MobileNumberVerification.vue',
    'src/components/Wallet/SpendOtpModal.vue',
  ])('%s', (file) => {
    const s = read(file);
    expect(s).toContain('useResendCountdown()');
    expect(s).not.toContain('countdown.value -= 1');
    expect(s).not.toContain('countdown.value === 0');
    expect(s).not.toContain('pTimeout');
  });

  it('no longer depends on p-timeout', () => {
    expect(read('package.json')).not.toContain('p-timeout');
  });
});
