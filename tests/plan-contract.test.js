'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const lib = require('../hooks/scripts/lib');
const fixture = require('./fixtures/plans/positive.json');
const negative = require('./fixtures/plans/negative.json');
const root = path.resolve(__dirname, '..');
const commonGit = execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: root, encoding: 'utf8' }).trim();
const mainRoot = path.dirname(path.resolve(root, commonGit));
const source = path.resolve(mainRoot, fixture.sourceArtifact);
if (!fs.existsSync(source)) throw new Error(`strict reviewed Planner artifact unavailable: ${source}`);
const text = fs.readFileSync(source, 'utf8');
const syntax = lib.parseStrictPlan(text, null, { syntaxOnly: true });
if (!syntax.ok || syntax.tasks.length !== fixture.taskCount) throw new Error(`self-parse syntax failed: ${syntax.code}`);
const captured = lib.capturePlanPathBaselineAtCommit(root, fixture.baseCommit, syntax.declaredPaths);
if (!captured.ok) throw new Error(`generation-relative baseline failed: ${captured.code}`);
const parsed = lib.parseStrictPlan(text, captured.baseline);
if (!parsed.ok || parsed.obligations.reduce((n, item) => n + item.receiptCount, 0) !== fixture.receiptCount) {
  throw new Error(`strict obligation parse failed: ${parsed.code}`);
}
for (const item of negative.cases) {
  let mutated = text;
  let baseline = captured.baseline;
  if (item.mutation === 'bom') mutated = '\ufeff' + text;
  if (item.mutation === 'crlf') mutated = text.replace(/\n/g, '\r\n');
  if (item.mutation === 'missing-baseline') baseline = null;
  if (item.mutation === 'checked-acceptance') mutated = text.replace('- [ ] Exact exported identity', '- [x] Exact exported identity');
  if (item.mutation === 'noncontiguous-task') mutated = text.replace('### Task 2:', '### Task 8:');
  if (item.mutation === 'noncontiguous-step') mutated = text.replace('**Step 2:**', '**Step 9:**');
  const outcome = lib.parseStrictPlan(mutated, baseline);
  if (outcome.ok || outcome.code !== item.code) throw new Error(`${item.name}: expected ${item.code}, received ${outcome.code}`);
}
process.stdout.write('PLAN_OBLIGATIONS_DERIVED\n');
