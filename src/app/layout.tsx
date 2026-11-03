import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "说人话，选笔记本",
  description:
    "把「看得清」「轻一点」「打游戏」这类模糊说法，翻译成可以被参数验证的条件，并把翻译依据摊开给你看。",
};

// 在首帧渲染前恢复黑夜模式，避免刷新时先闪一下白再变黑
// 支持 ?theme=dark / ?theme=light 直接指定（也便于测试）
const themeInitScript = `
(function () {
  try {
    var p = new URLSearchParams(location.search).get("theme");
    var t = p || localStorage.getItem("theme");
    if (t === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
`;export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
