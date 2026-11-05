"use client";

import LaptopCard from "@/components/LaptopCard";
import MouseCard from "@/components/MouseCard";
import KeyboardCard from "@/components/KeyboardCard";
import MonitorCard from "@/components/MonitorCard";
import { useFavorites } from "@/context/FavoritesContext";
import { getLaptopById } from "@/data/laptops";
import { getMouseById } from "@/data/mouse-specs";
import { getKeyboardById } from "@/data/keyboard-specs";
import { getMonitorById } from "@/data/monitor-specs";
import { formatCpu } from "@/lib/cpu";
import type { MatchResult } from "@/lib/match";
import type { MouseMatchResult } from "@/lib/mouse-match";
import type { KeyboardMatchResult } from "@/lib/keyboard-match";
import type { MonitorMatchResult } from "@/lib/monitor-match";
import type { ReactNode } from "react";

interface FavoritesPanelProps {
  onClose: () => void;
}

/**
 * 「我的收藏」二级界面：覆盖层铺满整屏，可随时点「← 返回」回到当前主界面。
 *
 * 现在支持四个类目的收藏：笔记本（cat-*）/ 鼠标（mouse-*）/ 键盘（kb-*）/ 显示器（monitor-*）。
 * 靠 id 前缀区分类型，分别查回完整参数并渲染对应卡片；取消收藏复用各卡片右下角的 ☆/★ 按钮。
 */
export default function FavoritesPanel({ onClose }: FavoritesPanelProps) {
  const { favoriteIds } = useFavorites();

  const cards: ReactNode[] = [];
  for (const id of favoriteIds) {
    if (id.startsWith("mouse-")) {
      const mouse = getMouseById(id);
      if (mouse) {
        const result: MouseMatchResult = {
          mouse,
          score: 0,
          reason: `参考价 ¥${mouse.priceMin}${mouse.priceMax !== mouse.priceMin ? `~${mouse.priceMax}` : ""}`,
        };
        cards.push(<MouseCard key={id} result={result} />);
      }
    } else if (id.startsWith("kb-")) {
      const keyboard = getKeyboardById(id);
      if (keyboard) {
        const result: KeyboardMatchResult = {
          keyboard,
          score: 0,
          reason: `参考价 ¥${keyboard.priceMin}${keyboard.priceMax !== keyboard.priceMin ? `~${keyboard.priceMax}` : ""}`,
        };
        cards.push(<KeyboardCard key={id} result={result} />);
      }
    } else if (id.startsWith("monitor-")) {
      const monitor = getMonitorById(id);
      if (monitor) {
        const result: MonitorMatchResult = {
          monitor,
          score: 0,
          reason: `参考价 ¥${monitor.priceMin}${monitor.priceMax !== monitor.priceMin ? `~${monitor.priceMax}` : ""}`,
        };
        cards.push(<MonitorCard key={id} result={result} />);
      }
    } else {
      const laptop = getLaptopById(id);
      if (laptop) {
        const result: MatchResult = {
          laptop,
          score: 0,
          reason: `到手 ${laptop.price} 元 · ${formatCpu(laptop.cpu.name)} · ${laptop.gpu}`,
        };
        cards.push(<LaptopCard key={id} result={result} />);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-5 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            我的收藏
            {cards.length > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-400">
                {cards.length} 件
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            ← 返回
          </button>
        </div>

        {cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-400">
            还没有收藏任何产品。点卡片右下角的 ☆ 就能收藏到这里。
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {cards}
          </div>
        )}
      </div>
    </div>
  );
}
