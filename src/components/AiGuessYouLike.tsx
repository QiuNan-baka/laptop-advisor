"use client";

import { useCallback, useEffect, useState } from "react";
import LaptopCard from "@/components/LaptopCard";
import { laptops } from "@/data/laptops";
import { formatCpu } from "@/lib/cpu";
import type { MatchResult } from "@/lib/match";

/**
 * 「AI 猜你喜欢」：随机从机型库里抽一台，用和匹配结果一致的卡片展示。
 *
 * - 进页面后随机抽一台；点左上角 ↺ 再抽一台；
 * - 相邻两次展示的机型不能重复（机型库 > 1 台时保证）；
 * - 卡片完全复用 LaptopCard，参数全部来自机型库，不编造。
 * - enabled=false（其余类目数据未接入）时渲染为空，待用户补充数据。
 */

/** 随机抽一个下标；传了 avoid 就保证不抽到它 */
function randomIndex(avoid?: number): number {
  const n = laptops.length;
  if (n === 0) return -1;
  if (n === 1) return 0;
  let next = Math.floor(Math.random() * n);
  while (avoid !== undefined && next === avoid) {
    next = Math.floor(Math.random() * n);
  }
  return next;
}

/** 随机推荐没有筛选约束，reason 就用「到手价 · CPU · GPU」这一行，和匹配卡片一致 */
function buildGuessReason(laptop: (typeof laptops)[number]): string {
  return `到手 ${laptop.price} 元 · ${formatCpu(laptop.cpu.name)} · ${laptop.gpu}`;
}

export default function AiGuessYouLike({ enabled = true }: { enabled?: boolean }) {
  // 初始为 null，等客户端挂载后再随机，避免 SSR 与客户端随机值不一致（hydration mismatch）。
  // 随机值在微任务里落地，而不是同步 setState——既避开 eslint set-state-in-effect，
  // 又保证首屏服务端与客户端渲染一致（都是 null）。
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

  if (!enabled) {
    return null;
  }

  if (index === null || index < 0 || !laptops[index]) {
    return null;
  }

  const laptop = laptops[index];
  const result: MatchResult = {
    laptop,
    score: 0,
    reason: buildGuessReason(laptop),
  };

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">AI猜你喜欢</h2>
        <button
          type="button"
          onClick={reroll}
          title="换一台"
          aria-label="换一台"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-base leading-none text-slate-500 transition hover:border-slate-400 hover:bg-slate-50"
        >
          ↺
        </button>
      </div>
      <LaptopCard result={result} />
    </section>
  );
}
