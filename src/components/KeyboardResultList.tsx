"use client";

import type { KeyboardMatchResult } from "@/lib/keyboard-match";
import KeyboardCard from "@/components/KeyboardCard";

interface KeyboardResultListProps {
  items: KeyboardMatchResult[];
}

/** 键盘匹配结果平铺列表。 */
export default function KeyboardResultList({ items }: KeyboardResultListProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <KeyboardCard key={item.keyboard.id} result={item} />
      ))}
    </div>
  );
}
