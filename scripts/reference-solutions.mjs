/**
 * Reference JavaScript solutions (stdin → stdout) for every catalogue problem.
 * Used by scripts/verify-problems.mjs to prove the test data is correct, and
 * by the smoke test to submit known-good code.
 */
const read = 'const L = require("fs").readFileSync(0, "utf8").split("\\n");\n';

import { EXTRA_PROBLEMS } from "./problem-sources/extra-problems.mjs";

export const REFERENCE_SOLUTIONS = {
  "two-sum": `${read}
const n = +L[0]; const a = L[1].trim().split(/\\s+/).map(Number); const t = +L[2];
const seen = new Map();
for (let i = 0; i < n; i++) { if (seen.has(t - a[i])) { console.log(seen.get(t - a[i]) + " " + i); break; } seen.set(a[i], i); }`,

  "valid-parentheses": `${read}
const s = (L[0] || "").trim(); const st = []; const pair = { ")": "(", "]": "[", "}": "{" }; let ok = true;
for (const c of s) { if ("([{".includes(c)) st.push(c); else if (st.pop() !== pair[c]) { ok = false; break; } }
console.log(ok && st.length === 0 ? "true" : "false");`,

  "reverse-linked-list": `${read}
const n = +L[0]; const vals = n ? L[1].trim().split(/\\s+/) : [];
let head = null; for (let i = vals.length - 1; i >= 0; i--) head = { v: vals[i], next: head };
let prev = null; while (head) { const nx = head.next; head.next = prev; prev = head; head = nx; }
const out = []; while (prev) { out.push(prev.v); prev = prev.next; } console.log(out.join(" "));`,

  "binary-search": `${read}
const a = L[1].trim().split(/\\s+/).map(Number); const t = +L[2];
let lo = 0, hi = a.length - 1, ans = -1;
while (lo <= hi) { const m = (lo + hi) >> 1; if (a[m] === t) { ans = m; break; } if (a[m] < t) lo = m + 1; else hi = m - 1; }
console.log(ans);`,

  "longest-substring-without-repeating-characters": `${read}
const s = L[0] || ""; const last = new Map(); let left = 0, best = 0;
for (let i = 0; i < s.length; i++) { if (last.has(s[i]) && last.get(s[i]) >= left) left = last.get(s[i]) + 1; last.set(s[i], i); best = Math.max(best, i - left + 1); }
console.log(best);`,

  "merge-intervals": `${read}
const n = +L[0]; const iv = []; for (let i = 1; i <= n; i++) iv.push(L[i].trim().split(/\\s+/).map(Number));
iv.sort((x, y) => x[0] - y[0]); const out = [];
for (const [s, e] of iv) { if (out.length && s <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], e); else out.push([s, e]); }
console.log(out.map((x) => x.join(" ")).join("\\n"));`,

  "kth-largest-element": `${read}
const [n, k] = L[0].trim().split(/\\s+/).map(Number); const a = L[1].trim().split(/\\s+/).map(Number).slice(0, n);
a.sort((x, y) => y - x); console.log(a[k - 1]);`,

  "number-of-islands": `${read}
const [r, c] = L[0].trim().split(/\\s+/).map(Number); const g = []; for (let i = 1; i <= r; i++) g.push((L[i] || "").trim().split(""));
let count = 0;
for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) if (g[i][j] === "1") {
  count++; const st = [[i, j]]; g[i][j] = "0";
  while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < r && ny < c && g[nx][ny] === "1") { g[nx][ny] = "0"; st.push([nx, ny]); } } }
}
console.log(count);`,

  "coin-change": `${read}
const [, amount] = L[0].trim().split(/\\s+/).map(Number); const coins = L[1].trim().split(/\\s+/).map(Number);
const dp = Array(amount + 1).fill(Infinity); dp[0] = 0;
for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;
console.log(dp[amount] === Infinity ? -1 : dp[amount]);`,

  "binary-tree-level-order": `${read}
const tok = (L[0] || "").trim() ? L[0].trim().split(/\\s+/) : [];
if (!tok.length) { console.log(""); } else {
  const root = { v: tok[0] }; const q = [root]; let i = 1;
  while (q.length && i < tok.length) { const node = q.shift(); if (i < tok.length && tok[i] !== "null") { node.l = { v: tok[i] }; q.push(node.l); } i++; if (i < tok.length && tok[i] !== "null") { node.r = { v: tok[i] }; q.push(node.r); } i++; }
  const out = []; let level = [root];
  while (level.length) { out.push(level.map((x) => x.v).join(" ")); level = level.flatMap((x) => [x.l, x.r].filter(Boolean)); }
  console.log(out.join("\\n"));
}`,

  "jump-game": `${read}
const a = L[1].trim().split(/\\s+/).map(Number); let reach = 0, ok = true;
for (let i = 0; i < a.length; i++) { if (i > reach) { ok = false; break; } reach = Math.max(reach, i + a[i]); }
console.log(ok ? "true" : "false");`,

  "edit-distance": `${read}
const a = (L[0] || "").trim(), b = (L[1] || "").trim();
const dp = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
console.log(dp[a.length][b.length]);`,

  "n-queens-count": `${read}
const n = +L[0]; let count = 0; const cols = new Set(), d1 = new Set(), d2 = new Set();
(function place(r) { if (r === n) { count++; return; } for (let c = 0; c < n; c++) { if (cols.has(c) || d1.has(r - c) || d2.has(r + c)) continue; cols.add(c); d1.add(r - c); d2.add(r + c); place(r + 1); cols.delete(c); d1.delete(r - c); d2.delete(r + c); } })(0);
console.log(count);`,

  "network-delay-time": `${read}
const [n, m, k] = L[0].trim().split(/\\s+/).map(Number); const adj = Array.from({ length: n + 1 }, () => []);
for (let i = 1; i <= m; i++) { const [u, v, w] = L[i].trim().split(/\\s+/).map(Number); adj[u].push([v, w]); }
const dist = Array(n + 1).fill(Infinity); dist[k] = 0; const done = Array(n + 1).fill(false);
for (let it = 0; it < n; it++) { let u = -1; for (let v = 1; v <= n; v++) if (!done[v] && (u === -1 || dist[v] < dist[u])) u = v; if (u === -1 || dist[u] === Infinity) break; done[u] = true; for (const [v, w] of adj[u]) if (dist[u] + w < dist[v]) dist[v] = dist[u] + w; }
const worst = Math.max(...dist.slice(1)); console.log(worst === Infinity ? -1 : worst);`,
};

// Second batch: references live next to their problem statements.
for (const p of EXTRA_PROBLEMS) REFERENCE_SOLUTIONS[p.slug] = p.ref;
