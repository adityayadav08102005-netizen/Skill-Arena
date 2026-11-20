/**
 * Runs every offline test suite (no database, no network, no server) and
 * fails if any of them fails.   npm test
 *
 * Separate suites that need more:
 *   npm run test:seed   seed script against an in-memory MongoDB
 *   npm run test:smoke  end-to-end checks against a running server (see the README)
 */
import { spawnSync } from "node:child_process";

const SUITES = [
  ["Contest scoring and calendar", "scripts/test-scoring.mjs"],
  ["Assessment scoring and question bank", "scripts/test-assessments.mjs"],
  ["External API mappers", "scripts/test-external.mjs"],
  ["Config, headers and origin checks", "scripts/test-security.mjs"],
  ["Problem catalogue (reference solutions)", "scripts/verify-problems.mjs"],
];

let failed = 0;
for (const [name, file] of SUITES) {
  console.log(`\n▸ ${name}`);
  const run = spawnSync(process.execPath, [file], { stdio: "inherit" });
  if (run.status !== 0) {
    failed += 1;
    console.error(`  ✖ ${name} failed (exit ${run.status})`);
  }
}
console.log(failed ? `\n${failed} of ${SUITES.length} suites failed.` : `\nAll ${SUITES.length} suites passed.`);
process.exitCode = failed ? 1 : 0;
