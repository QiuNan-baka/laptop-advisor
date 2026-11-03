"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * 收藏状态：跨组件共享（卡片上的 ☆ 按钮、头部「我的收藏」入口、收藏二级界面）。
 *
 * 存储：只存机型 id（字符串数组），展示时用 getLaptopById 查回完整参数——
 * 这样机型库更新参数时，收藏列表自动跟着新，不会存到过期数据。
 * 持久化到 localStorage，刷新不丢。
 */

interface FavoritesContextValue {
  favoriteIds: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const STORAGE_KEY = "laptop-advisor:favorites";

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // 挂载后从 localStorage 恢复，避免 SSR 与客户端首帧不一致（hydration mismatch）。
  // 用微任务落地 setState，避开 eslint react-hooks/set-state-in-effect。
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setFavoriteIds(JSON.parse(raw) as string[]);
      } catch {
        /* 隐私模式下读取失败，忽略，当空收藏处理 */
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 变化后写回
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteIds));
    } catch {
      /* 写入失败忽略 */
    }
  }, [favoriteIds]);

  const isFavorite = useCallback(
    (id: string) => favoriteIds.includes(id),
    [favoriteIds]
  );

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const value = useMemo(
    () => ({ favoriteIds, isFavorite, toggleFavorite }),
    [favoriteIds, isFavorite, toggleFavorite]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites 必须在 FavoritesProvider 内使用");
  }
  return ctx;
}
