"use client";

import LaptopCard from "@/components/LaptopCard";
import { useFavorites } from "@/context/FavoritesContext";
import { getLaptopById } from "@/data/laptops";
import { formatCpu } from "@/lib/cpu";
import type { MatchResult } from "@/lib/match";

interface FavoritesPanelProps {
  onClose: () => void;
}

/**
 * 「我的收藏」二级界面：覆盖层铺满整屏，可随时点「← 返回」回到当前主界面。
 *
 * 取消收藏的交互直接复用 LaptopCard 右下角的 ★/☆ 按钮——
 * 一旦取消，该 id 从 favoriteIds 里移除，列表自动把它从库里去掉。
 */
export default function FavoritesPanel({ onClose }: FavoritesPanelProps) {
  const { favoriteIds } = useFavorites();

  const results: MatchResult[] = favoriteIds.flatMap((id) => {
    const laptop = getLaptopById(id);
    if (!laptop) return [];
    return [
      {
        laptop,
        score: 0,
        reason: `到手 ${laptop.price} 元 · ${formatCpu(laptop.cpu.name)} · ${laptop.gpu}`,
      },
    ];
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-5 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            我的收藏
            {results.length > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-400">
                {results.length} 台
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

        {results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-400">
            还没有收藏任何机型。点卡片右下角的 ☆ 就能收藏到这里。
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {results.map((r) => (
              <LaptopCard key={r.laptop.id} result={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
