"use client";

import { useEffect, useRef, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { useFavorites } from "@/context/FavoritesContext";
import { CATEGORIES, type CategoryId } from "@/data/categories";

interface SiteHeaderProps {
  onOpenFavorites: () => void;
  activeCategory: CategoryId;
  onSwitchCategory: (id: CategoryId) => void;
}

export default function SiteHeader({
  onOpenFavorites,
  activeCategory,
  onSwitchCategory,
}: SiteHeaderProps) {
  const { favoriteIds } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // 点击菜单外部时收起
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-left text-[2.0625rem] font-bold leading-tight tracking-tight text-slate-900">
            按你所想，如你所愿——产品AI的智能检索
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            你不需要懂参数。说清楚你要拿它干什么，我把这句话翻译成可以验证的条件，
            <span className="font-medium text-slate-700">并且把翻译过程摊开给你看</span>
            ——哪条理解错了，你直接删掉。
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2">
          {/* 「更多」菜单：hover 或点击展开，向外延伸出类目小菜单 */}
          <div
            className="relative"
            ref={menuRef}
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-amber-300 hover:text-amber-700 hover:shadow-md"
            >
              更多
              <span aria-hidden className="text-xs transition-transform">
                {menuOpen ? "▲" : "▼"}
              </span>
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 w-[7.5rem] pt-1"
              >
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  {CATEGORIES.map((c) => {
                    const active = c.id === activeCategory;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onSwitchCategory(c.id);
                          setMenuOpen(false);
                        }}
                        className={`block w-full px-3 py-2 text-left text-sm transition ${
                          active
                            ? "bg-amber-50 text-amber-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                        }`}
                      >
                        {c.menuLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenFavorites}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-amber-300 hover:text-amber-700 hover:shadow-md"
          >
            <span aria-hidden>★</span>
            我的收藏
            {favoriteIds.length > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-700">
                {favoriteIds.length}
              </span>
            )}
          </button>
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
