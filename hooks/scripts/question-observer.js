'use strict';

// The approved runtime selects stop-transcript. AskUserQuestion is unsupported,
// so this always-present observer intentionally emits no stdout and records no proof.
// A future approved ask-user-question capability must amend the sealed plan and hook
// registration before this branch may process tool events.
const fs = require('fs');
const path = require('path');
const { readStdin } = require('./lib');

try {
  const input = readStdin();
  const cwd = input.cwd || process.cwd();
  const capabilities = JSON.parse(fs.readFileSync(path.join(cwd, 'tests', 'fixtures', 'runtime', 'capabilities.json'), 'utf8'));
  if (capabilities.questionObserver !== 'ask-user-question') process.exit(0);
  // Fail closed: this release has no approved Ask payload schema.
  process.exit(0);
} catch {
  process.exit(0);
}
