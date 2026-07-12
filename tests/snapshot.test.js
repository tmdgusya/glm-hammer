'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const lib = require('../hooks/scripts/lib');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'glm-snapshot-'));
function git(args) { return execFileSync('git', args, { cwd: tmp, encoding: 'utf8' }).trim(); }
git(['init', '-q']); git(['config', 'user.email', 'test@example.invalid']); git(['config', 'user.name', 'snapshot-test']);
fs.writeFileSync(path.join(tmp, 'tracked.txt'), 'one\n');
fs.writeFileSync(path.join(tmp, 'stable.txt'), 'stable rename content\n');
git(['add', 'tracked.txt', 'stable.txt']); git(['commit', '-qm', 'base']);
const baselineHead = git(['rev-parse', 'HEAD']);
let first = lib.buildSourceSnapshot(tmp, { baselineHead, declaredPaths: ['tracked.txt', 'future.txt'] });
if (!first.ok || !lib.validateSourceSnapshot(first.snapshot).ok) throw new Error(`initial snapshot failed: ${first.code}`);
const future = first.snapshot.entries.find((entry) => entry.path === 'future.txt');
if (!future || future.status !== 'ABSENT' || future.sha256 !== null) throw new Error('declared absent path not represented');
fs.writeFileSync(path.join(tmp, 'tracked.txt'), 'two\n');
const changed = lib.buildSourceSnapshot(tmp, { baselineHead, declaredPaths: ['tracked.txt', 'future.txt'] });
if (!changed.ok || changed.sha256 === first.sha256) throw new Error('dirty content did not invalidate snapshot');
git(['add', 'tracked.txt']); git(['commit', '-qm', 'edit']);
const committed = lib.buildSourceSnapshot(tmp, { baselineHead, declaredPaths: ['tracked.txt', 'future.txt'] });
if (!committed.ok || !committed.snapshot.entries.some((entry) => entry.path === 'tracked.txt' && entry.status === 'MODIFIED')) {
  throw new Error('committed diff missing');
}
fs.renameSync(path.join(tmp, 'stable.txt'), path.join(tmp, 'renamed.txt'));
git(['add', '-A']); git(['commit', '-qm', 'rename']);
const renamed = lib.buildSourceSnapshot(tmp, { baselineHead, declaredPaths: ['renamed.txt'] });
if (!renamed.ok || !renamed.snapshot.entries.some((entry) => entry.status === 'RENAMED_TO')) throw new Error('rename missing');
const unavailable = lib.buildSourceSnapshot(tmp, { baselineHead: 'f'.repeat(40), declaredPaths: [] });
if (unavailable.ok || unavailable.code !== 'SNAPSHOT_HISTORY_UNAVAILABLE') throw new Error('missing history did not block');
fs.rmSync(tmp, { recursive: true, force: true });
process.stdout.write('SNAPSHOT_CONTRACT_OK\n');
