import ThemeToggle from "@/components/ThemeToggle";
import { useFavorites } from "@/context/FavoritesContext";

interface SiteHeaderProps {
  onOpenFavorites: () => void;
}

export default function SiteHeader({ onOpenFavorites }: SiteHeaderProps) {
  const { favoriteIds } = useFavorites();

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
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenFavorites}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-amber-300 hover:text-amber-700 hover:shadow-md"
          >
            <span aria-hidden>★</span>
            我的收藏
            {favoriteIds.length > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-700">
                {favoriteIds.length}
              </span>
            )}
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
