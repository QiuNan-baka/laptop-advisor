"use client";

import type { KeyboardMatchResult } from "@/lib/keyboard-match";
import {
  KEYBOARD_USAGE_LABELS,
  LAYOUT_LABELS,
  SWITCH_TYPE_LABELS,
} from "@/data/keyboard-specs";
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

function connectionLabel(connections: string[]): string {
  const hasWired = connections.includes("wired");
  const has24g = connections.includes("wireless24g");
  const hasBt = connections.includes("bluetooth");
  if (hasWired && has24g && hasBt) return "三模";
  const parts: string[] = [];
  if (hasWired) parts.push("有线");
  if (has24g) parts.push("2.4G");
  if (hasBt) parts.push("蓝牙");
  return parts.join("/");
}

interface KeyboardCardProps {
  result: KeyboardMatchResult;
}

/** 单款键盘卡片：参数全部来自 keyboard-specs.ts 真实解析数据。 */
export default function KeyboardCard({ result }: KeyboardCardProps) {
  const { keyboard, reason, overBudgetBy } = result;
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(keyboard.id);

  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white p-5 pb-9 shadow-sm transition duration-300 ease-out hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">
          {keyboard.brand} {keyboard.model}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">
            ¥{keyboard.priceMin}
            {keyboard.priceMax !== keyboard.priceMin ? `~${keyboard.priceMax}` : ""}
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
        <Spec label="配列" value={LAYOUT_LABELS[keyboard.layout]} />
        <Spec
          label="轴体"
          value={keyboard.switchTypes.map((s) => SWITCH_TYPE_LABELS[s]).join(" / ")}
        />
        <Spec label="连接" value={connectionLabel(keyboard.connections)} />
        <Spec
          label="用途"
          value={keyboard.usages.map((u) => KEYBOARD_USAGE_LABELS[u]).join(" / ")}
        />
        <Spec label="网页驱动" value={keyboard.webDriver ? "有" : "无"} />
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-600">
        <span className="text-emerald-600">点评 </span>
        {keyboard.comment}
      </p>

      <button
        type="button"
        onClick={() => toggleFavorite(keyboard.id)}
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
