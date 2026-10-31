interface SiteFooterProps {
  laptopCount: number;
  dictionaryCount: number;
  guideCount: number;
}

export default function SiteFooter({
  laptopCount,
  dictionaryCount,
  guideCount,
}: SiteFooterProps) {
  return (
    <footer className="mt-10 text-center text-xs leading-5 text-slate-400">
      实测参数库 {laptopCount} 台 · 推荐名录 {guideCount} 台 · 需求词典{" "}
      {dictionaryCount} 条 ·
      所有参数来自实测库，AI 只负责解释参数对你意味着什么，不生成参数。
    </footer>
  );
}
