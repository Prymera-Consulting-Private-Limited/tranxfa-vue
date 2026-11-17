import {describe, expect, it} from 'vitest';
import moment from 'moment';
import {useTimeUtils} from '@/composables/time_utils.js';

// SD-1112: getNiceTime() reached the catalogue through a bare t(), which this
// module could not see. Every timestamp between 5 and 30 minutes old, and
// between 2 and 5 hours old, threw ReferenceError - on the dashboard, the
// transaction list, the wallet, the wallet statement, recipient cards and
// device cards. No spec rendered those branches, so 1493 tests stayed green.
describe('getNiceTime', () => {
  const {getNiceTime} = useTimeUtils();
  const ago = (n, unit) => moment().subtract(n, unit).toISOString();

  it.each([
    ['30 seconds', ago(30, 'second')],
    ['10 minutes', ago(10, 'minute')],
    ['90 minutes', ago(90, 'minute')],
    ['3 hours', ago(3, 'hour')],
    ['8 hours', ago(8, 'hour')],
    ['3 days', ago(3, 'day')],
    ['3 weeks', ago(3, 'week')],
  ])('renders a stamp %s old', (_label, stamp) => {
    const said = getNiceTime(stamp);

    expect(said).toBeTypeOf('string');
    expect(said.trim()).not.toBe('');
  });

  it('says how long ago, letting moment supply the words', () => {
    expect(getNiceTime(ago(10, 'minute'))).toBe('10 minutes ago');
    expect(getNiceTime(ago(3, 'hour'))).toBe('3 hours ago');
  });

  it('drops to a clock time once the phrase stops helping', () => {
    const said = getNiceTime(ago(8, 'hour'));

    expect(said).not.toMatch(/ago/);
    expect(said).toMatch(/\d/);
  });

  it('names the weekday within the week, and the date beyond it', () => {
    expect(getNiceTime(ago(3, 'day'))).toMatch(/^[A-Z][a-z]+day$/);
    expect(getNiceTime(ago(3, 'week'))).toMatch(/\d{4}/);
  });
});
