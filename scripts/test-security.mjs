/**
 * Unit tests for start-up config checks, security headers and the CSRF origin check.
 *   node scripts/test-security.mjs
 */
import assert from "node:assert/strict";
import { checkEnv } from "../lib/env.js";
import { securityHeaders } from "../lib/security/headers.js";
import { isSameOrigin } from "../lib/security/origin.js";

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ✔ ${name}`);
  } catch (error) {
    console.error(`  ✖ ${name}\n    ${error.message}`);
    process.exitCode = 1;
  }
};

const good = {
  NODE_ENV: "production",
  MONGODB_URI: "mongodb+srv://user:pass@cluster0.example.mongodb.net/",
  BETTER_AUTH_SECRET: "q8V1n3xR0pZ7wK2mT9bL4sY6dH5cJ0aF",
  BETTER_AUTH_URL: "https://skillarena.example.com",
  CRON_SECRET: "a-long-random-cron-value",
  GITHUB_TOKEN: "x",
  JUDGE0_URL: "https://judge0-ce.p.rapidapi.com",
  JUDGE0_API_KEY: "k",
  JUDGE0_API_HOST: "judge0-ce.p.rapidapi.com",
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
};

test("checkEnv: demo mode needs nothing", () => {
  const r = checkEnv({ NODE_ENV: "production" });
  assert.equal(r.mode, "demo");
  assert.deepEqual(r.errors, []);
});

test("checkEnv: a complete production config passes", () => {
  const r = checkEnv(good);
  assert.equal(r.mode, "database");
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});

test("checkEnv: unsafe or broken production settings are errors", () => {
  const errorsFor = (patch) => checkEnv({ ...good, ...patch }).errors.join(" | ");
  assert.match(errorsFor({ BETTER_AUTH_SECRET: "" }), /BETTER_AUTH_SECRET is required/);
  assert.match(errorsFor({ BETTER_AUTH_SECRET: "short" }), /at least 32/);
  assert.match(errorsFor({ BETTER_AUTH_SECRET: "memory-db-only-secret-not-for-production-0123456789" }), /placeholder/);
  assert.match(errorsFor({ BETTER_AUTH_URL: "http://skillarena.example.com" }), /https/);
  assert.match(errorsFor({ BETTER_AUTH_URL: "not a url" }), /valid URL/);
  assert.match(errorsFor({ MONGODB_URI: "postgres://x" }), /mongodb/);
  assert.match(errorsFor({ GOOGLE_CLIENT_SECRET: "" }), /both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET/);
  assert.match(errorsFor({ JUDGE0_URL: "http://localhost:2358" }), /localhost in production/);
  assert.match(errorsFor({ JUDGE0_API_KEY: "" }), /JUDGE0_API_HOST is set without/);
  assert.match(errorsFor({ CRON_SECRET: "short" }), /CRON_SECRET/);
});

test("checkEnv: development is relaxed, optional features only warn", () => {
  const r = checkEnv({ NODE_ENV: "development", MONGODB_URI: "mongodb://127.0.0.1:27017/x", BETTER_AUTH_SECRET: "memory-db-only-secret-not-for-production-0123456789", BETTER_AUTH_URL: "http://localhost:3000" });
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => w.includes("No code runner")));
  assert.ok(r.warnings.some((w) => w.includes("GITHUB_TOKEN")));
  assert.ok(r.warnings.some((w) => w.includes("CRON_SECRET")));
});

test("checkEnv: CODE_RUNNER=paiza counts as a code runner; other values are rejected", () => {
  const { JUDGE0_URL, JUDGE0_API_KEY, JUDGE0_API_HOST, ...noJudge0 } = good;
  assert.ok(JUDGE0_URL && JUDGE0_API_KEY && JUDGE0_API_HOST);
  assert.ok(checkEnv(noJudge0).warnings.some((w) => w.includes("No code runner")), "missing runner not warned");
  const paiza = checkEnv({ ...noJudge0, CODE_RUNNER: "paiza" });
  assert.deepEqual(paiza.errors, []);
  assert.ok(!paiza.warnings.some((w) => w.includes("No code runner")));
  assert.match(checkEnv({ ...noJudge0, CODE_RUNNER: "piston" }).errors.join(" "), /CODE_RUNNER must be/);
});

test("securityHeaders: strict CSP and hardening headers; HSTS only in production", () => {
  const byKey = (list) => Object.fromEntries(list.map((h) => [h.key, h.value]));
  const prod = byKey(securityHeaders({ production: true }));
  const dev = byKey(securityHeaders({ production: false }));
  const csp = prod["Content-Security-Policy"];
  for (const d of ["default-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"]) assert.ok(csp.includes(d), `missing ${d}`);
  assert.ok(!csp.includes("unsafe-eval"), "unsafe-eval in production CSP");
  assert.ok(dev["Content-Security-Policy"].includes("unsafe-eval"), "dev server needs eval for fast refresh");
  assert.equal(prod["X-Frame-Options"], "DENY");
  assert.equal(prod["X-Content-Type-Options"], "nosniff");
  assert.match(prod["Strict-Transport-Security"], /max-age=\d{8}/);
  assert.equal(dev["Strict-Transport-Security"], undefined);
});

const req = (headers, host = "skillarena.example.com") => ({ headers: new Headers(headers), nextUrl: { host } });

test("isSameOrigin: same site allowed, other sites and opaque origins refused", () => {
  assert.equal(isSameOrigin(req({ origin: "https://skillarena.example.com", host: "skillarena.example.com" }), "https://skillarena.example.com"), true);
  assert.equal(isSameOrigin(req({ origin: "https://evil.example", host: "skillarena.example.com" }), "https://skillarena.example.com"), false);
  assert.equal(isSameOrigin(req({ origin: "https://skillarena.example.com.evil.example", host: "skillarena.example.com" })), false, "suffix trick accepted");
  assert.equal(isSameOrigin(req({ origin: "null", host: "skillarena.example.com" })), false);
  assert.equal(isSameOrigin(req({ origin: "not a url" })), false);
  assert.equal(isSameOrigin(req({ host: "skillarena.example.com" })), true, "non-browser client without Origin");
  // Behind a proxy the public URL counts even if the internal host differs.
  assert.equal(isSameOrigin(req({ origin: "https://skillarena.example.com", host: "internal:3000" }, "internal:3000"), "https://skillarena.example.com"), true);
  assert.equal(isSameOrigin(req({ origin: "http://localhost:3000", host: "localhost:3000" }, "localhost:3000"), "http://localhost:3000"), true);
});

console.log(`\n${passed} security tests passed${process.exitCode ? ", some failed" : ""}.`);
