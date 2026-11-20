/**
 * Runs every reference solution against every sample and hidden test of the
 * catalogue, locally with Node, to prove the problem data is correct.
 *
 *   node scripts/verify-problems.mjs
 */
import { spawnSync } from "node:child_process";
import { problems } from "../data/problems/index.js";
import { REFERENCE_SOLUTIONS } from "./reference-solutions.mjs";

const norm = (s) => String(s ?? "").replace(/\r\n/g, "\n").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").replace(/\n+$/, "");
let failures = 0;
let checked = 0;

for (const p of problems) {
  const code = REFERENCE_SOLUTIONS[p.slug];
  if (!code) {
    console.log(`✖ ${p.slug}: no reference solution`);
    failures += 1;
    continue;
  }
  const tests = [...p.samples.map((t) => ({ ...t, kind: "sample" })), ...p.hiddenTests.map((t) => ({ ...t, kind: "hidden" }))];
  for (const [i, t] of tests.entries()) {
    const run = spawnSync(process.execPath, ["-e", code], { input: t.input, encoding: "utf8", timeout: 5000 });
    checked += 1;
    if (run.status !== 0 || norm(run.stdout) !== norm(t.output)) {
      failures += 1;
      console.log(`✖ ${p.slug} ${t.kind} #${i + 1}: expected ${JSON.stringify(t.output)}, got ${JSON.stringify(run.stdout)} ${run.stderr ? `(stderr: ${run.stderr.slice(0, 200)})` : ""}`);
    }
  }
}

console.log(failures ? `\n${failures} failing of ${checked} test runs.` : `\n✔ All ${checked} sample and hidden tests match the reference solutions (${problems.length} problems).`);
process.exit(failures ? 1 : 0);
