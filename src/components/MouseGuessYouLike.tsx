"use client";

import { useCallback, useEffect, useState } from "react";
import MouseCard from "@/components/MouseCard";
import { mice } from "@/data/mouse-specs";
import type { MouseMatchResult } from "@/lib/mouse-match";

/**
 * 鼠标类目的「AI 猜你喜欢」：随机抽一款，用和匹配结果一致的卡片展示。
 * 逻辑与笔记本版 AiGuessYouLike 相同，只是数据源换成 mice。
 */

function randomIndex(avoid?: number): number {
  const n = mice.length;
  if (n === 0) return -1;
  if (n === 1) return 0;
  let next = Math.floor(Math.random() * n);
  while (avoid !== undefined && next === avoid) {
    next = Math.floor(Math.random() * n);
  }
  return next;
}

function buildGuessReason(mouse: (typeof mice)[number]): string {
  const parts = [`参考价 ¥${mouse.priceMin}${mouse.priceMax !== mouse.priceMin ? `~${mouse.priceMax}` : ""}`];
  if (mouse.weight !== undefined) parts.push(`${mouse.weight}g`);
  parts.push(mouse.comment.split("，")[0] ?? mouse.comment);
  return parts.join(" · ");
}

export default function MouseGuessYouLike() {
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

  if (index === null || index < 0 || !mice[index]) {
    return null;
  }

  const mouse = mice[index];
  const result: MouseMatchResult = {
    mouse,
    score: 0,
    reason: buildGuessReason(mouse),
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
      <MouseCard result={result} />
    </section>
  );
}
