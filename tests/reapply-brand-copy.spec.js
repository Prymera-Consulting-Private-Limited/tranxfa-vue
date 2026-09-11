import {describe, expect, it} from 'vitest';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// The brand-copy script decides what lands on a Spanish production build.
// Its own self-test covers the matching rules; this keeps it in the suite.
describe('scripts/reapply-brand-copy.py', () => {
  it('passes its self-test', () => {
    const run = spawnSync('python3', ['scripts/reapply-brand-copy.py', '--self-test'], {cwd: ROOT, encoding: 'utf8'});
    expect(run.stdout, run.stdout + run.stderr).toContain('self-test passed');
    expect(run.status).toBe(0);
  });
});
