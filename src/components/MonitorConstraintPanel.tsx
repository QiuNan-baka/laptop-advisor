"use client";

import {
  MONITOR_CONSTRAINT_LABELS,
  type MonitorConstraints,
} from "@/data/monitor-dictionary";
import {
  MONITOR_USAGE_LABELS,
  PANEL_TYPE_LABELS,
  RESOLUTION_LABELS,
} from "@/data/monitor-specs";
import type { MonitorParseResult } from "@/lib/monitor-match";

function renderValue(key: keyof MonitorConstraints, value: unknown): string {
  if (key === "panelTypes") {
    return (value as string[]).map((v) => PANEL_TYPE_LABELS[v as keyof typeof PANEL_TYPE_LABELS] ?? v).join("、");
  }
  if (key === "resolutions") {
    return (value as string[]).map((v) => RESOLUTION_LABELS[v as keyof typeof RESOLUTION_LABELS] ?? v).join("、");
  }
  if (key === "usages") {
    return (value as string[]).map((v) => MONITOR_USAGE_LABELS[v as keyof typeof MONITOR_USAGE_LABELS] ?? v).join("、");
  }
  if (key === "miniLed") return value ? "MiniLED" : "";
  if (key === "curved") return value ? "曲面" : "";
  if (key === "sizeMin") return `≥ ${value} 英寸`;
  if (key === "sizeMax") return `≤ ${value} 英寸`;
  if (key === "refreshMin") return `≥ ${value} Hz`;
  if (key === "brightnessMin") return `≥ ${value} nit`;
  if (typeof value === "number") return `${value}`;
  return String(value);
}

interface MonitorConstraintPanelProps {
  constraints: MonitorConstraints;
  traces: MonitorParseResult["traces"];
  onRemove: (key: keyof MonitorConstraints) => void;
}

export default function MonitorConstraintPanel({
  constraints,
  traces,
  onRemove,
}: MonitorConstraintPanelProps) {
  const entries = Object.entries(constraints).filter(
    ([, value]) =>
      value !== undefined &&
      !(Array.isArray(value) && value.length === 0) &&
      !(typeof value === "boolean" && value === false)
  ) as [keyof MonitorConstraints, unknown][];

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-800">我理解到的条件</h2>
        <span className="text-xs text-slate-400">共 {entries.length} 条，可逐条删除</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">
          没识别出任何条件。试着说具体一点，比如「2K 高刷」「IPS 面板」「预算 1000 以内」。
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
                  <span className="text-slate-400">{MONITOR_CONSTRAINT_LABELS[key]}</span>
                  {valueText && <span className="font-medium">{valueText}</span>}
                  <button
                    type="button"
                    onClick={() => onRemove(key)}
                    aria-label={`删除条件 ${MONITOR_CONSTRAINT_LABELS[key]}`}
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
