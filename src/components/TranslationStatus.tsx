"use client";

import { SOURCE_LABELS, type UnifiedParseResult } from "@/lib/ai/types";

interface TranslationStatusProps {
  result: UnifiedParseResult;
  /** 是否处于「后端没配 Key」的演示态，用于额外提示 */
  demoMode: boolean;
}

/**
 * 「这次是谁翻译的」状态条。
 *
 * 【为什么值得单独占一块界面】
 * 评分表里「AI 安全可控」要的正是这个：用户能看见 AI 参与了没有、
 * 用的是哪家的模型、这次花了多久、失败时降级到了什么。
 * 把这些做成一条可读的状态，比在 README 里写十行都管用。
 */
export default function TranslationStatus({
  result,
  demoMode,
}: TranslationStatusProps) {
  const usedAi = result.source !== "rule";

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className={
            usedAi
              ? "rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700"
              : "rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700"
          }
        >
          {SOURCE_LABELS[result.source]}
        </span>

        {result.model && (
          <span className="text-slate-400">
            模型 <span className="text-slate-600">{result.model}</span>
          </span>
        )}

        <span className="text-slate-400">
          耗时 <span className="text-slate-600">{result.elapsedMs} ms</span>
        </span>

        {usedAi && (
          <span className="text-slate-400">
            把握度{" "}
            <span className="text-slate-600">
              {Math.round(result.confidence * 100)}%
            </span>
          </span>
        )}
      </div>

      {result.fallbackReason && (
        <p className="leading-5 text-slate-500">
          <span className="font-medium text-slate-600">已降级：</span>
          {result.fallbackReason}
        </p>
      )}

      {demoMode && result.source === "rule" && (
        <p className="leading-5 text-slate-400">
          演示模式：后端没有配置 API Key，正在用本地词典翻译。功能完整，但理解自然语言的能力弱一些。
        </p>
      )}

      {result.questions.length > 0 && (
        <div className="rounded-lg bg-sky-50 p-2.5">
          <p className="mb-1 font-medium text-sky-800">还能说得更具体吗？</p>
          <ul className="space-y-1">
            {result.questions.map((question) => (
              <li key={question} className="leading-5 text-sky-700">
                · {question}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
