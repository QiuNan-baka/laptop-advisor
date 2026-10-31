"use client";

import type { MatchResult } from "@/lib/match";
import type { GuideCategory } from "@/data/guide-catalog";
import {
  GUIDE_CATEGORY_DESC,
  GUIDE_CATEGORY_LABELS,
} from "@/data/guide-catalog";
import LaptopCard from "@/components/LaptopCard";

/** 三个定位栏目的固定展示顺序 */
const CATEGORY_ORDER: GuideCategory[] = ["gaming", "allround", "ultrabook"];

interface ResultByCategoryProps {
  items: MatchResult[];
}

/**
 * 把匹配结果按「游戏本 / 全能本 / 轻薄本」分成三个可折叠栏目。
 *
 * 分类定义来自《【双11】笔记本电脑选购指南》原文，见 guide-catalog.ts 的
 * GUIDE_CATEGORY_DESC。每台机型的 category 在生成 catalog-specs.ts 时已按
 * 指南原文的定位归好类。
 */
export default function ResultByCategory({ items }: ResultByCategoryProps) {
  const grouped = new Map<GuideCategory, MatchResult[]>();
  for (const cat of CATEGORY_ORDER) grouped.set(cat, []);
  for (const item of items) {
    const cat = item.laptop.category ?? "allround";
    grouped.get(cat)?.push(item);
  }

  return (
    <div className="space-y-3">
      {CATEGORY_ORDER.map((cat) => {
        const list = grouped.get(cat) ?? [];
        return (
          <details
            key={cat}
            open
            className="group rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <summary className="flex cursor-pointer items-baseline justify-between gap-3 px-5 py-3 select-none">
              <span className="text-sm font-semibold text-slate-900">
                {GUIDE_CATEGORY_LABELS[cat]}
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {list.length} 台
                </span>
              </span>
              <span className="text-xs text-slate-400 transition group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="border-t border-slate-100 px-5 py-4">
              <p className="mb-3 text-xs leading-5 text-slate-500">
                {GUIDE_CATEGORY_DESC[cat]}
              </p>
              {list.length > 0 ? (
                <div className="space-y-3">
                  {list.map((item) => (
                    <LaptopCard key={item.laptop.id} result={item} />
                  ))}
                </div>
              ) : (
                <p className="py-2 text-xs text-slate-400">
                  本栏暂无匹配机型
                </p>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
