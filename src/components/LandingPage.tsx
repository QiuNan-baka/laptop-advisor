"use client";

import ThemeToggle from "@/components/ThemeToggle";

/**
 * 一级界面（落地页）：以「按你所想，如你所愿」八个字为主题。
 * 右上角保留黑夜/白天切换；底部「前往探索 →」进入二级界面（主应用）。
 * 收藏入口不放这里——它属于二级界面（主应用）的 SiteHeader。
 */
export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="relative flex min-h-full flex-col px-6 py-16">
      {/* 右上角：黑夜/白天切换（保留，与主界面一致） */}
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      {/* 主题区：八个字竖排居中，整体向下移动 50% + 100px */}
      <div className="flex flex-1 translate-y-[calc(50%+100px)] flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold leading-snug tracking-[0.25em] text-slate-900 sm:text-5xl md:text-6xl">
          按你所想
          <br />
          如你所愿
        </h1>
        <p className="mt-8 text-sm tracking-[0.35em] text-slate-500 sm:text-base">
          产品AI的智能检索
        </p>
      </div>

      {/* 底部：前往探索 →（动效与主界面按钮一致，向下移动 200% + 100px，尺寸增大 50%） */}
      <div className="flex translate-y-[calc(200%+100px)] justify-center pb-4">
        <button
          type="button"
          onClick={onEnter}
          className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-10 py-4 text-xl font-medium text-slate-700 shadow-sm transition hover:border-amber-300 hover:text-amber-700 hover:shadow-md"
        >
          前往探索
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
