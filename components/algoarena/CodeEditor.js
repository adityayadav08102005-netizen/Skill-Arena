"use client";

import { loader } from "@monaco-editor/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });

/** Light theme matching the SkillArena palette. */
function defineTheme(monaco) {
  monaco.editor.defineTheme("skillarena", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6B6A80", fontStyle: "italic" },
      { token: "keyword", foreground: "534AB7" },
      { token: "string", foreground: "0F6E56" },
      { token: "number", foreground: "854F0B" },
      { token: "type", foreground: "3C3489" },
    ],
    colors: {
      "editor.background": "#FFFFFF",
      "editor.lineHighlightBackground": "#F7F6FB",
      "editorLineNumber.foreground": "#B4B2C4",
      "editorLineNumber.activeForeground": "#534AB7",
      "editor.selectionBackground": "#CECBF6",
      "editorCursor.foreground": "#534AB7",
      "editorIndentGuide.background1": "#EEEDFE",
    },
  });
}

/**
 * Monaco editor (loaded from its CDN) with a plain-textarea fallback, so the
 * workspace still works offline or when the CDN is blocked.
 */
export default function CodeEditor({ language, value, onChange, onRun, onSubmit }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loader.init().catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <div className="flex h-full flex-col">
        <p className="bg-xp-50 px-3 py-1.5 text-xs text-xp-800">The code editor couldn&apos;t load, so you&apos;re using a plain text editor.</p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label="Code"
          className="min-h-0 flex-1 resize-none p-3 font-mono text-[13px] leading-relaxed outline-none"
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              const { selectionStart: s, selectionEnd: end } = e.currentTarget;
              onChange(`${value.slice(0, s)}    ${value.slice(end)}`);
              requestAnimationFrame(() => e.target.setSelectionRange(s + 4, s + 4));
            }
          }}
        />
      </div>
    );
  }

  return (
    <Monaco
      height="100%"
      language={language === "cpp" ? "cpp" : language}
      value={value}
      theme="skillarena"
      beforeMount={defineTheme}
      onMount={(editor, monaco) => {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRun?.());
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => onSubmit?.());
      }}
      onChange={(v) => onChange(v ?? "")}
      loading={<div className="h-full animate-pulse bg-page" aria-label="Loading editor" />}
      options={{
        fontSize: 13,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        tabSize: 4,
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
        smoothScrolling: true,
        cursorSmoothCaretAnimation: "on",
        renderLineHighlight: "all",
        ariaLabel: "Code editor",
      }}
    />
  );
}
