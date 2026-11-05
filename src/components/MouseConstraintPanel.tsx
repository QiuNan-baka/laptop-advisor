"use client";

import {
  MOUSE_CONSTRAINT_LABELS,
  type MouseConstraints,
} from "@/data/mouse-dictionary";
import {
  GRIP_LABELS,
  HAND_SIZE_LABELS,
  MOUSE_USAGE_LABELS,
} from "@/data/mouse-specs";
import type { MouseParseResult } from "@/lib/mouse-match";

/** 把一条鼠标约束的值渲染成人话 */
function renderValue(key: keyof MouseConstraints, value: unknown): string {
  if (key === "handSizes") {
    return (value as string[]).map((v) => HAND_SIZE_LABELS[v as keyof typeof HAND_SIZE_LABELS] ?? v).join("、");
  }
  if (key === "grips") {
    return (value as string[]).map((v) => GRIP_LABELS[v as keyof typeof GRIP_LABELS] ?? v).join("、");
  }
  if (key === "usages") {
    return (value as string[]).map((v) => MOUSE_USAGE_LABELS[v as keyof typeof MOUSE_USAGE_LABELS] ?? v).join("、");
  }
  if (key === "connections") {
    const conn = value as string[];
    const labels: Record<string, string> = { wired: "有线", wireless24g: "2.4G", bluetooth: "蓝牙" };
    return conn.map((c) => labels[c] ?? c).join("、");
  }
  if (key === "weightMax") return `${value}g 以内`;
  if (typeof value === "boolean") return "";
  if (typeof value === "number") return `${value}`;
  return String(value);
}

interface MouseConstraintPanelProps {
  constraints: MouseConstraints;
  traces: MouseParseResult["traces"];
  onRemove: (key: keyof MouseConstraints) => void;
}

/**
 * 鼠标翻译结果面板：一条约束一个标签，可单独删除。
 * 与笔记本版 ConstraintPanel 同构，只是字段换成鼠标维度。
 */
export default function MouseConstraintPanel({
  constraints,
  traces,
  onRemove,
}: MouseConstraintPanelProps) {
  const entries = Object.entries(constraints).filter(
    ([, value]) =>
      value !== undefined &&
      !(Array.isArray(value) && value.length === 0) &&
      !(typeof value === "boolean" && value === false)
  ) as [keyof MouseConstraints, unknown][];

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
          没识别出任何条件。试着说具体一点，比如「小手」「打游戏」「预算 200 以内」。
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {entries.map(([key, value]) => {
              const valueText = renderValue(key, value);
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                >
                  <span className="text-slate-400">{MOUSE_CONSTRAINT_LABELS[key]}</span>
                  {valueText && <span className="font-medium">{valueText}</span>}
                  <button
                    type="button"
                    onClick={() => onRemove(key)}
                    aria-label={`删除条件 ${MOUSE_CONSTRAINT_LABELS[key]}`}
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
