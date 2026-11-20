"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, FlaskConical, Loader2, Play, RotateCcw, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import ReportButton from "@/components/common/ReportButton";
import SlidingTabs from "@/components/common/SlidingTabs";
import Countdown from "@/components/landing/Countdown";
import { LANGUAGES, LANGUAGE_KEYS } from "@/lib/execution/languages";
import { cn } from "@/lib/utils/cn";
import CodeEditor from "./CodeEditor";
import Confetti from "./Confetti";
import ProblemPanel from "./ProblemPanel";
import ResultPanel from "./ResultPanel";

// Per-viewer convenience: drafts live in this browser only.
const storage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* storage unavailable: drafts just aren't remembered */
    }
  },
};

/**
 * The coding workspace: problem on the left, editor + tests on the right,
 * floating Run / Submit bar. `execution` is "judge0", "paiza" or "demo"; in demo mode
 * every result is labelled as not executed.
 */
export default function Workspace({ problem, isDaily, execution, viewer, contest = null }) {
  const draftKey = (lang) => `sa:code:${contest ? `${contest.slug}:` : ""}${problem.slug}:${lang}`;
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(problem.starter.python);
  const [bottomTab, setBottomTab] = useState("tests");
  const [sample, setSample] = useState(0);
  const [useCustom, setUseCustom] = useState(false);
  const [customInput, setCustomInput] = useState(problem.samples[0]?.input ?? "");
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [confetti, setConfetti] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [leftWidth, setLeftWidth] = useState(42);
  const dragging = useRef(false);
  const contestLive = contest?.state === "live";
  const canSubmit = viewer.signedIn && viewer.role === "student" && (!contest || (contestLive && contest.registered));

  // Restore the last language and draft for this problem (after mount, so SSR markup matches).
  useEffect(() => {
    const lang = storage.get("sa:lang");
    const start = LANGUAGE_KEYS.includes(lang) ? lang : "python";
    const timer = setTimeout(() => {
      setLanguage(start);
      setCode(storage.get(`sa:code:${problem.slug}:${start}`) ?? problem.starter[start]);
    }, 0);
    return () => clearTimeout(timer);
  }, [problem.slug, problem.starter]);

  const changeCode = (value) => {
    setCode(value);
    storage.set(draftKey(language), value);
  };

  const changeLanguage = (lang) => {
    storage.set("sa:lang", lang);
    setLanguage(lang);
    setCode(storage.get(draftKey(lang)) ?? problem.starter[lang]);
  };

  const resetCode = () => {
    setCode(problem.starter[language]);
    storage.set(draftKey(language), problem.starter[language]);
  };

  const call = useCallback(
    async (kind) => {
      if (busy) return;
      if (kind === "submit" && !canSubmit) {
        setBottomTab("result");
        setResult(null);
        setError(
          !viewer.signedIn
            ? "Log in as a student to submit."
            : viewer.role !== "student"
              ? "Only student accounts can submit solutions."
              : contest && !contestLive
                ? "This contest has ended. Practise the problem in AlgoArena."
                : "Register for the contest to submit.",
        );
        return;
      }
      if (!code.trim()) {
        setBottomTab("result");
        setError("Write some code first.");
        return;
      }
      setBusy(kind);
      setError("");
      setBottomTab("result");
      try {
        const body = contest ? { problemSlug: problem.slug, language, code } : { slug: problem.slug, language, code };
        if (kind === "run" && useCustom) body.customInput = customInput;
        const url = contest ? `/api/contests/${contest.slug}/${kind}` : `/api/algoarena/${kind}`;
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setResult(null);
          setError(res.status === 401 ? "Log in to run code." : data.error || "Something went wrong. Try again.");
        } else {
          setResult({ kind, data });
          if (kind === "submit") {
            setRefreshKey((k) => k + 1);
            if (data.status === "accepted") setConfetti(Date.now());
          }
        }
      } catch {
        setError("You appear to be offline. Try again.");
      } finally {
        setBusy(null);
      }
    },
    [busy, canSubmit, viewer.signedIn, viewer.role, contest, contestLive, code, problem.slug, language, useCustom, customInput],
  );

  // Draggable divider between the two panes (desktop).
  useEffect(() => {
    const move = (e) => {
      if (!dragging.current) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      setLeftWidth(Math.min(65, Math.max(28, pct)));
    };
    const up = () => {
      dragging.current = false;
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return (
    <div className="wide-page space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={contest ? `/contests/${contest.slug}` : "/algoarena"} className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink">
          <ArrowLeft size={14} aria-hidden="true" /> {contest ? contest.title : "Problems"}
        </Link>
        {contest && (
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs shadow-float">
            {contestLive ? (
              <>
                <span className="size-1.5 animate-pulse rounded-full bg-danger-600" aria-hidden="true" /> Live · ends in{" "}
                <Countdown startsAt={contest.endsAt} className="font-mono tabular-nums" />
              </>
            ) : (
              "Contest ended · submissions closed"
            )}
            {contest.points ? <span className="text-xp-700">{contest.points} pts</span> : null}
          </span>
        )}
        {execution === "demo" && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-xp-50 px-3 py-1 text-xs text-xp-800"
            title="No code runner (Judge0) is configured. Run shows expected outputs and submissions are saved without being executed."
          >
            <FlaskConical size={13} aria-hidden="true" /> Demo mode: code isn&apos;t executed
          </span>
        )}
        {viewer.signedIn && viewer.role !== "admin" && <ReportButton entityType="problem" entityId={problem.id} what="problem" className="ml-auto" />}
      </div>

      <div
        className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:h-[calc(100vh-13.5rem)] lg:min-h-[540px] lg:gap-0 lg:[grid-template-columns:var(--left)_10px_minmax(0,1fr)]"
        style={{ "--left": `${leftWidth}%` }}
      >
        <section className="min-h-0 overflow-hidden rounded-card border border-line bg-panel max-lg:max-h-[70vh]">
          <ProblemPanel
            problem={problem}
            isDaily={isDaily}
            canSubmit={viewer.signedIn && viewer.role === "student"}
            refreshKey={refreshKey}
            onLoadCode={(lang, savedCode) => {
              storage.set("sa:lang", lang);
              storage.set(draftKey(lang), savedCode);
              setLanguage(lang);
              setCode(savedCode);
            }}
          />
        </section>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
          onPointerDown={() => {
            dragging.current = true;
            document.body.style.cursor = "col-resize";
          }}
          className="group hidden cursor-col-resize items-center justify-center lg:flex"
        >
          <span className="h-10 w-1 rounded-full bg-line transition-colors group-hover:bg-arena-300" />
        </div>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-card border border-line bg-panel max-lg:h-[80vh]">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <label className="sr-only" htmlFor="language">Language</label>
            <select
              id="language"
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="h-8 rounded-lg border border-line bg-panel px-2 text-sm outline-none transition-colors hover:border-arena-200 focus:border-arena-400"
            >
              {LANGUAGE_KEYS.map((l) => <option key={l} value={l}>{LANGUAGES[l].label}</option>)}
            </select>
            <button type="button" onClick={resetCode} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:bg-page hover:text-ink">
              <RotateCcw size={13} aria-hidden="true" /> Reset code
            </button>
          </div>

          <div className="min-h-[260px] flex-[3]">
            <CodeEditor language={LANGUAGES[language].monaco} value={code} onChange={changeCode} onRun={() => call("run")} onSubmit={() => call("submit")} />
          </div>

          <div className="flex min-h-[200px] flex-[2] flex-col border-t border-line">
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <SlidingTabs
                className="shadow-none"
                ariaLabel="Tests and results"
                value={bottomTab}
                onChange={setBottomTab}
                tabs={[{ value: "tests", label: "Test cases" }, { value: "result", label: "Result" }]}
              />
              <div className="flex items-center gap-1.5 rounded-full border border-line bg-panel p-1 shadow-float">
                <button
                  type="button"
                  onClick={() => call("run")}
                  disabled={Boolean(busy)}
                  className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full px-3.5 py-1.5 text-sm before:absolute before:inset-0 before:-translate-x-[101%] before:bg-arena-50 before:transition-transform before:duration-300 before:ease-snap hover:before:translate-x-0"
                >
                  {busy === "run" ? <Loader2 size={14} className="relative animate-spin" aria-hidden="true" /> : <Play size={14} className="relative" aria-hidden="true" />}
                  <span className="relative">Run</span>
                </button>
                <button
                  type="button"
                  onClick={() => call("submit")}
                  disabled={Boolean(busy)}
                  className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-bridge-600 px-3.5 py-1.5 text-sm font-medium text-white before:absolute before:inset-0 before:-translate-x-[101%] before:bg-bridge-800 before:transition-transform before:duration-300 before:ease-snap hover:before:translate-x-0"
                >
                  {busy === "submit" ? <Loader2 size={14} className="relative animate-spin" aria-hidden="true" /> : <Send size={14} className="relative" aria-hidden="true" />}
                  <span className="relative">Submit</span>
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              <AnimatePresence mode="wait">
                <motion.div key={bottomTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  {bottomTab === "tests" ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {problem.samples.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { setSample(i); setUseCustom(false); }}
                            className={cn("rounded-full px-3 py-1 text-xs transition-colors", !useCustom && sample === i ? "bg-arena-50 text-arena-800" : "text-muted hover:bg-page")}
                          >
                            Sample {i + 1}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setUseCustom(true)}
                          disabled={execution === "demo"}
                          title={execution === "demo" ? "Custom input needs a code runner" : undefined}
                          className={cn("rounded-full px-3 py-1 text-xs transition-colors disabled:opacity-50", useCustom ? "bg-arena-50 text-arena-800" : "text-muted hover:bg-page")}
                        >
                          Custom input
                        </button>
                      </div>
                      {useCustom ? (
                        <textarea
                          value={customInput}
                          onChange={(e) => setCustomInput(e.target.value)}
                          rows={4}
                          aria-label="Custom input"
                          spellCheck={false}
                          className="w-full rounded-lg border border-line bg-page p-2 font-mono text-[12px] outline-none focus:border-arena-400"
                        />
                      ) : (
                        <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
                          <div>
                            <div className="mb-1 text-[11px] text-muted">Input</div>
                            <pre className="overflow-x-auto rounded-lg border border-line bg-page px-2.5 py-1.5 font-mono text-[12px]">{problem.samples[sample]?.input || " "}</pre>
                          </div>
                          <div>
                            <div className="mb-1 text-[11px] text-muted">Expected output</div>
                            <pre className="overflow-x-auto rounded-lg border border-line bg-page px-2.5 py-1.5 font-mono text-[12px]">{problem.samples[sample]?.output || " "}</pre>
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] text-muted">Run checks the sample tests{useCustom ? " — or just your custom input" : ""}. Submit also runs hidden tests.</p>
                    </div>
                  ) : (
                    <ResultPanel busy={busy} result={result} error={error} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>
      </div>

      {confetti > 0 && <Confetti burstKey={confetti} />}
    </div>
  );
}
