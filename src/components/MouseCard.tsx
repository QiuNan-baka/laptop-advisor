"use client";

import type { MouseMatchResult } from "@/lib/mouse-match";
import {
  GRIP_LABELS,
  HAND_SIZE_LABELS,
  MOUSE_USAGE_LABELS,
} from "@/data/mouse-specs";
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

/** 连接方式 → 人话 */
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

interface MouseCardProps {
  result: MouseMatchResult;
}

/** 单款鼠标卡片：所有参数都来自 mouse-specs.ts 真实解析数据，不是模型生成的。 */
export default function MouseCard({ result }: MouseCardProps) {
  const { mouse, reason, overBudgetBy } = result;
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(mouse.id);

  return (
    <article className="relative rounded-2xl border border-slate-200 bg-white p-5 pb-9 shadow-sm transition duration-300 ease-out hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">
          {mouse.brand} {mouse.model}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">
            ¥{mouse.priceMin}
            {mouse.priceMax !== mouse.priceMin ? `~${mouse.priceMax}` : ""}
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
        <Spec
          label="手长"
          value={mouse.handSize.map((h) => HAND_SIZE_LABELS[h]).join(" / ")}
        />
        <Spec
          label="握姿"
          value={mouse.grips.map((g) => GRIP_LABELS[g]).join(" / ")}
        />
        <Spec label="连接" value={connectionLabel(mouse.connections)} />
        <Spec
          label="用途"
          value={mouse.usages.map((u) => MOUSE_USAGE_LABELS[u]).join(" / ")}
        />
        {mouse.weight !== undefined && <Spec label="重量" value={`${mouse.weight} g`} />}
        <Spec label="网页驱动" value={mouse.webDriver ? "有" : "无"} />
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-600">
        <span className="text-emerald-600">点评 </span>
        {mouse.comment}
      </p>

      <button
        type="button"
        onClick={() => toggleFavorite(mouse.id)}
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
