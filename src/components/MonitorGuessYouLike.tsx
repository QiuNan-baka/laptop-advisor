"use client";

import { useCallback, useEffect, useState } from "react";
import MonitorCard from "@/components/MonitorCard";
import { monitors } from "@/data/monitor-specs";
import type { MonitorMatchResult } from "@/lib/monitor-match";

/** 显示器类目「AI 猜你喜欢」：随机抽一款，用匹配结果一致的卡片展示。 */

function randomIndex(avoid?: number): number {
  const n = monitors.length;
  if (n === 0) return -1;
  if (n === 1) return 0;
  let next = Math.floor(Math.random() * n);
  while (avoid !== undefined && next === avoid) {
    next = Math.floor(Math.random() * n);
  }
  return next;
}

function buildGuessReason(m: (typeof monitors)[number]): string {
  const parts = [`参考价 ¥${m.priceMin}${m.priceMax !== m.priceMin ? `~${m.priceMax}` : ""}`];
  parts.push(m.comment.split("，")[0] ?? m.comment);
  return parts.join(" · ");
}

export default function MonitorGuessYouLike() {
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setIndex(randomIndex());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const reroll = useCallback(() => {
    setIndex((prev) => randomIndex(prev ?? undefined));
  }, []);

  if (index === null || index < 0 || !monitors[index]) {
    return null;
  }

  const monitor = monitors[index];
  const result: MonitorMatchResult = {
    monitor,
    score: 0,
    reason: buildGuessReason(monitor),
  };

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">AI猜你喜欢</h2>
        <button
          type="button"
          onClick={reroll}
          title="换一款"
          aria-label="换一款"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-base leading-none text-slate-500 transition hover:border-slate-400 hover:bg-slate-50"
        >
          ↺
        </button>
      </div>
      <MonitorCard result={result} />
    </section>
  );
}
