"use client";

import type { MonitorMatchResult } from "@/lib/monitor-match";
import {
  MONITOR_USAGE_LABELS,
  PANEL_TYPE_LABELS,
  RESOLUTION_LABELS,
} from "@/data/monitor-specs";
import SpeakButton from "@/components/SpeakButton";
import { useFavorites } from "@/context/FavoritesContext";

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <span className="text-slate-400">{label}</span>
      <span>{value}</span>
    </div>
  );
}

interface MonitorCardProps {
  result: MonitorMatchResult;
}

/** 单款显示器卡片：参数全部来自 monitor-specs.ts 真实解析数据。 */
export default function MonitorCard({ result }: MonitorCardProps) {
  const { monitor, reason, overBudgetBy } = result;
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(monitor.id);

  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white p-5 pb-9 shadow-sm transition duration-300 ease-out hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">
          {monitor.brand} {monitor.model}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">
            ¥{monitor.priceMin}
            {monitor.priceMax !== monitor.priceMin ? `~${monitor.priceMax}` : ""}
          </span>
          {overBudgetBy !== undefined && (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-600">
              超预算 ¥{overBudgetBy}
            </span>
          )}
        </div>
      </div>

      <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
        <span>{reason}</span>
        <SpeakButton text={reason} label="朗读" />
      </p>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-3">
        <Spec label="尺寸" value={`${monitor.sizeInch} 英寸`} />
        <Spec label="面板" value={`${PANEL_TYPE_LABELS[monitor.panelType]}${monitor.miniLed ? " · MiniLED" : ""}`} />
        <Spec label="分辨率" value={RESOLUTION_LABELS[monitor.resolution]} />
        <Spec label="刷新率" value={`${monitor.refreshRate} Hz`} />
        <Spec label="亮度" value={`${monitor.brightness} nit`} />
        <Spec
          label="用途"
          value={monitor.usages.map((u) => MONITOR_USAGE_LABELS[u]).join(" / ")}
        />
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-600">
        <span className="text-emerald-600">点评 </span>
        {monitor.comment}
      </p>

      <button
        type="button"
        onClick={() => toggleFavorite(monitor.id)}
        aria-label={favorite ? "取消收藏" : "收藏"}
        title={favorite ? "取消收藏" : "收藏"}
        className={`absolute bottom-2.5 right-3 text-2xl leading-none transition hover:scale-125 ${
          favorite ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
        }`}
      >
        {favorite ? "★" : "☆"}
      </button>
    </article>
  );
}
