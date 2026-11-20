/**
 * DEV-ONLY mock of the Judge0 API, for testing the real execution path
 * without a Judge0 account:
 *
 *   node scripts/mock-judge0.mjs            # listens on 127.0.0.1:2358
 *   JUDGE0_URL=http://127.0.0.1:2358 npm run dev
 *
 * It runs submitted JavaScript (and Python, if `python` is on PATH) as a local
 * child process with a time limit. That is NOT a sandbox: never expose this
 * server or use it in production. Real deployments must use Judge0.
 *
 * Supports POST /submissions?base64_encoded=true&wait=true, which is all
 * lib/execution/judge0.js uses.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.MOCK_JUDGE0_PORT || 2358);
const RUNTIMES = {
  63: { file: "main.js", cmd: process.execPath, args: (f) => [f] },
  71: { file: "main.py", cmd: "python", args: (f) => [f] },
};

const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const unb64 = (s) => (s ? Buffer.from(s, "base64").toString("utf8") : "");

function run(languageId, source, stdin, limitSeconds) {
  const runtime = RUNTIMES[languageId];
  if (!runtime) {
    return Promise.resolve({ status: { id: 13, description: "Internal Error" }, message: b64(`mock-judge0 only runs JavaScript (63) and Python (71), not ${languageId}`) });
  }
  const dir = mkdtempSync(join(tmpdir(), "mock-judge0-"));
  const file = join(dir, runtime.file);
  writeFileSync(file, source);
  const started = performance.now();

  return new Promise((resolve) => {
    const child = spawn(runtime.cmd, runtime.args(file), { cwd: dir, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, limitSeconds * 1000);
    child.stdout.on("data", (d) => {
      stdout += d;
      if (stdout.length > 1_000_000) child.kill("SIGKILL");
    });
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (e) => (stderr += e.message));
    child.on("close", (code) => {
      clearTimeout(timer);
      rmSync(dir, { recursive: true, force: true });
      const time = ((performance.now() - started) / 1000).toFixed(3);
      const status = timedOut
        ? { id: 5, description: "Time Limit Exceeded" }
        : code === 0
          ? { id: 3, description: "Accepted" }
          : { id: 11, description: "Runtime Error (NZEC)" };
      resolve({ stdout: b64(stdout), stderr: b64(stderr), compile_output: null, message: null, status, time, memory: 9000 });
    });
    child.stdin.end(stdin);
  });
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method !== "POST" || url.pathname !== "/submissions") {
    res.writeHead(404, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "not found" }));
    return;
  }
  let body = "";
  for await (const chunk of req) body += chunk;
  try {
    const data = JSON.parse(body);
    const result = await run(data.language_id, unb64(data.source_code), unb64(data.stdin), Number(data.cpu_time_limit) || 3);
    res.writeHead(201, { "Content-Type": "application/json" }).end(JSON.stringify(result));
  } catch (error) {
    res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: error.message }));
  }
}).listen(PORT, "127.0.0.1", () => console.log(`mock-judge0 (dev only) listening on http://127.0.0.1:${PORT}`));
