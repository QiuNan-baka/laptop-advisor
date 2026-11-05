"use client";

import type { MouseMatchResult } from "@/lib/mouse-match";
import MouseCard from "@/components/MouseCard";

interface MouseResultListProps {
  items: MouseMatchResult[];
}

/** 鼠标匹配结果平铺列表（鼠标没有游戏本/全能本/轻薄本分类，直接平铺）。 */
export default function MouseResultList({ items }: MouseResultListProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <MouseCard key={item.mouse.id} result={item} />
      ))}
    </div>
  );
}
