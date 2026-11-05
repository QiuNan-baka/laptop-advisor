"use client";

import {
  KEYBOARD_CONSTRAINT_LABELS,
  type KeyboardConstraints,
} from "@/data/keyboard-dictionary";
import {
  KEYBOARD_USAGE_LABELS,
  LAYOUT_LABELS,
  SWITCH_TYPE_LABELS,
} from "@/data/keyboard-specs";
import type { KeyboardParseResult } from "@/lib/keyboard-match";

function renderValue(key: keyof KeyboardConstraints, value: unknown): string {
  if (key === "layouts") {
    return (value as string[]).map((v) => LAYOUT_LABELS[v as keyof typeof LAYOUT_LABELS] ?? v).join("、");
  }
  if (key === "switchTypes") {
    return (value as string[]).map((v) => SWITCH_TYPE_LABELS[v as keyof typeof SWITCH_TYPE_LABELS] ?? v).join("、");
  }
  if (key === "connections") {
    const labels: Record<string, string> = { wired: "有线", wireless24g: "2.4G", bluetooth: "蓝牙" };
    return (value as string[]).map((c) => labels[c] ?? c).join("、");
  }
  if (key === "usages") {
    return (value as string[]).map((v) => KEYBOARD_USAGE_LABELS[v as keyof typeof KEYBOARD_USAGE_LABELS] ?? v).join("、");
  }
  if (key === "webDriver") return value ? "有网页驱动" : "无网页驱动";
  if (typeof value === "number") return `${value}`;
  return String(value);
}

interface KeyboardConstraintPanelProps {
  constraints: KeyboardConstraints;
  traces: KeyboardParseResult["traces"];
  onRemove: (key: keyof KeyboardConstraints) => void;
}

export default function KeyboardConstraintPanel({
  constraints,
  traces,
  onRemove,
}: KeyboardConstraintPanelProps) {
  const entries = Object.entries(constraints).filter(
    ([, value]) =>
      value !== undefined &&
      !(Array.isArray(value) && value.length === 0) &&
      !(typeof value === "boolean" && value === false)
  ) as [keyof KeyboardConstraints, unknown][];

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-800">我理解到的条件</h2>
        <span className="text-xs text-slate-400">共 {entries.length} 条，可逐条删除</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">
          没识别出任何条件。试着说具体一点，比如「75% 配列」「磁轴」「预算 500 以内」。
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
                  <span className="text-slate-400">{KEYBOARD_CONSTRAINT_LABELS[key]}</span>
                  {valueText && <span className="font-medium">{valueText}</span>}
                  <button
                    type="button"
                    onClick={() => onRemove(key)}
                    aria-label={`删除条件 ${KEYBOARD_CONSTRAINT_LABELS[key]}`}
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
                  <li key={trace.label} className="text-xs leading-5 text-slate-500">
                    <span className="font-medium text-slate-700">{trace.label}：</span>
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
