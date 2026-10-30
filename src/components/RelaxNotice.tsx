"use client";

interface RelaxNoticeProps {
  resultsCount: number;
  relaxLog: string[];
}

/**
 * 自主决策提示条：严格筛选没结果时，系统做了什么。
 * 要么「放宽了部分条件」，要么「宁可返回超预算机型也不改你的预算」。
 */
export default function RelaxNotice({
  resultsCount,
  relaxLog,
}: RelaxNoticeProps) {
  return (
    <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-800">
        {resultsCount > 0
          ? "没有机型同时满足全部条件，我自动放宽了部分条件"
          : "在你给的预算内没有符合条件的机型，我没有擅自改你的预算"}
      </p>
      <ul className="mt-2 space-y-1">
        {relaxLog.map((line) => (
          <li key={line} className="text-xs text-amber-700">
            · {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
