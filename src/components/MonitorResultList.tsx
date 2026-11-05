"use client";

import type { MonitorMatchResult } from "@/lib/monitor-match";
import MonitorCard from "@/components/MonitorCard";

interface MonitorResultListProps {
  items: MonitorMatchResult[];
}

/** 显示器匹配结果平铺列表。 */
export default function MonitorResultList({ items }: MonitorResultListProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <MonitorCard key={item.monitor.id} result={item} />
      ))}
    </div>
  );
}
