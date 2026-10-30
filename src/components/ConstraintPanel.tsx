"use client";

import {
  CONSTRAINT_LABELS,
  CONSTRAINT_UNITS,
  type Constraints,
} from "@/data/dictionary";
import type { ParseResult } from "@/lib/match";

const USAGE_NAMES: Record<string, string> = {
  office: "办公",
  coding: "写代码",
  gaming: "游戏",
  design: "设计/剪辑",
  study: "上课",
  video: "看剧",
};

/** 把一条约束的值渲染成人话 */
function renderConstraintValue(
  key: keyof Constraints,
  value: unknown
): string {
  if (key === "usages") {
    return (value as string[]).map((v) => USAGE_NAMES[v] ?? v).join("、");
  }
  if (typeof value === "boolean") return "";
  const unit = CONSTRAINT_UNITS[key] ?? "";
  return `${value}${unit}`;
}

interface ConstraintPanelProps {
  constraints: Constraints;
  traces: ParseResult["traces"];
  onRemove: (key: keyof Constraints) => void;
}

/**
 * 翻译结果面板：一条约束一个标签，可以单独删掉。
 * 这是「让翻译过程可见、可修改」的落点——用户看到机器理解成了什么，错了自己删。
 */
export default function ConstraintPanel({
  constraints,
  traces,
  onRemove,
}: ConstraintPanelProps) {
  const entries = Object.entries(constraints).filter(
    ([, value]) => value !== undefined
  ) as [keyof Constraints, unknown][];

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-800">我理解到的条件</h2>
        <span className="text-xs text-slate-400">
          共 {entries.length} 条，可逐条删除
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">
          没识别出任何条件。试着说具体一点，比如「预算
          6000」「要轻」「打游戏」。
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {entries.map(([key, value]) => {
              const valueText = renderConstraintValue(key, value);
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                >
                  <span className="text-slate-400">{CONSTRAINT_LABELS[key]}</span>
                  {valueText && <span className="font-medium">{valueText}</span>}
                  <button
                    type="button"
                    onClick={() => onRemove(key)}
                    aria-label={`删除条件 ${CONSTRAINT_LABELS[key]}`}
                    className="ml-0.5 rounded-full px-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>

          {traces.length > 0 && (
            <details className="mt-4 rounded-xl bg-slate-50 p-3">
              <summary className="cursor-pointer text-xs font-medium text-slate-600">
                看看我是怎么翻译的（{traces.length} 条依据）
              </summary>
              <ul className="mt-2 space-y-2">
                {traces.map((trace) => (
                  <li
                    key={trace.label}
                    className="text-xs leading-5 text-slate-500"
                  >
                    <span className="font-medium text-slate-700">
                      {trace.label}：
                    </span>
                    {trace.explain}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}
