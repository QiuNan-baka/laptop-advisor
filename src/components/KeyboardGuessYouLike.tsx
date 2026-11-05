"use client";

import { useCallback, useEffect, useState } from "react";
import KeyboardCard from "@/components/KeyboardCard";
import { keyboards } from "@/data/keyboard-specs";
import type { KeyboardMatchResult } from "@/lib/keyboard-match";

/** 键盘类目「AI 猜你喜欢」：随机抽一款，用匹配结果一致的卡片展示。 */

function randomIndex(avoid?: number): number {
  const n = keyboards.length;
  if (n === 0) return -1;
  if (n === 1) return 0;
  let next = Math.floor(Math.random() * n);
  while (avoid !== undefined && next === avoid) {
    next = Math.floor(Math.random() * n);
  }
  return next;
}

function buildGuessReason(kb: (typeof keyboards)[number]): string {
  const parts = [`参考价 ¥${kb.priceMin}${kb.priceMax !== kb.priceMin ? `~${kb.priceMax}` : ""}`];
  parts.push(kb.comment.split("，")[0] ?? kb.comment);
  return parts.join(" · ");
}

export default function KeyboardGuessYouLike() {
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

  if (index === null || index < 0 || !keyboards[index]) {
    return null;
  }

  const keyboard = keyboards[index];
  const result: KeyboardMatchResult = {
    keyboard,
    score: 0,
    reason: buildGuessReason(keyboard),
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
      <KeyboardCard result={result} />
    </section>
  );
}
