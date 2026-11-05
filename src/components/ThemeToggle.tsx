"use client";

import { useEffect, useState } from "react";

/**
 * 黑夜模式切换按钮：点击在 <html> 的 .dark 类之间切换，并把选择写入
 * localStorage。刷新时由 layout 里的内联脚本在首帧前恢复，避免闪白。
 */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      // 微任务落地 setState，避免在 effect 体内同步 setState（react-hooks/set-state-in-effect）。
      // 首帧前的主题恢复由 layout 内联脚本完成，这里只同步按钮图标状态。
      Promise.resolve().then(() => setDark(true));
      document.documentElement.classList.add("dark");
    }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* 隐私模式下写入失败不影响切换 */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "切换到白天模式" : "切换到黑夜模式"}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 hover:shadow-md"
    >
      {dark ? "☀️ 白天模式" : "🌙 黑夜模式"}
    </button>
  );
}
