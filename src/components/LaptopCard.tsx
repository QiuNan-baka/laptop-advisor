"use client";

import type { MatchResult } from "@/lib/match";
import { formatRam } from "@/data/laptops";
import SpeakButton from "@/components/SpeakButton";

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <span className="text-slate-400">{label}</span>
      <span>{value}</span>
    </div>
  );
}

interface LaptopCardProps {
  result: MatchResult;
}

/** 单台机型卡片：所有参数都直接来自机型库，不是模型生成的。 */
export default function LaptopCard({ result }: LaptopCardProps) {
  const { laptop, reason, overBudgetBy } = result;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">
          {laptop.brand} {laptop.model}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">
            ¥{laptop.price}
          </span>
          {laptop.subsidyPrice !== undefined && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600">
              国补 ¥{laptop.subsidyPrice}
            </span>
          )}
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
          label="屏幕"
          value={`${laptop.screen.sizeInch}" ${laptop.screen.resolution}`}
        />
        <Spec label="清晰度" value={`${laptop.screen.ppi} ppi`} />
        {laptop.screen.refreshRate !== undefined && (
          <Spec label="刷新率" value={`${laptop.screen.refreshRate} Hz`} />
        )}
        <Spec label="内存" value={formatRam(laptop)} />
        {laptop.storage !== undefined && (
          <Spec label="硬盘" value={`${laptop.storage} GB`} />
        )}
        <Spec label="重量" value={`${laptop.weight} kg`} />
      </div>

      <div className="mt-3 space-y-1">
        {laptop.highlights.map((highlight) => (
          <p key={highlight} className="text-xs leading-5 text-slate-600">
            <span className="text-emerald-600">优点 </span>
            {highlight}
          </p>
        ))}
        {laptop.drawbacks.map((drawback) => (
          <p key={drawback} className="text-xs leading-5 text-slate-500">
            <span className="text-rose-500">短板 </span>
            {drawback}
          </p>
        ))}
      </div>
    </article>
  );
}
