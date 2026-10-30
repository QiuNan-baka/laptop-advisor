interface SiteFooterProps {
  laptopCount: number;
  dictionaryCount: number;
}

export default function SiteFooter({
  laptopCount,
  dictionaryCount,
}: SiteFooterProps) {
  return (
    <footer className="mt-10 text-center text-xs leading-5 text-slate-400">
      机型库共 {laptopCount} 台 · 需求词典 {dictionaryCount} 条 ·
      所有参数来自机型库，AI 只负责解释参数对你意味着什么，不生成参数。
    </footer>
  );
}
