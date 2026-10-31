"use client";

import {
  GUIDE_CATEGORY_LABELS,
  formatPriceBand,
  type GuideEntry,
} from "@/data/guide-catalog";

interface GuideListProps {
  entries: GuideEntry[];
  /** 用户预算，用于把"和你预算同一段"的条目说清楚 */
  budget?: number;
}

/**
 * 推荐名录：同价位还有什么值得看。
 *
 * 这里刻意不给数字（重量、电池、屏幕），因为名录里没有确切数据。
 * 只把原文写的优点和短板原样摆出来——宁可信息少，也不编造参数。
 */
export default function GuideList({ entries, budget }: GuideListProps) {
  if (entries.length === 0) return null;

  return (
    <details
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      open={entries.length <= 4}
    >
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">
        {budget !== undefined
          ? `预算 ${budget} 元附近，这个价位段还有 ${entries.length} 台值得看`
          : `推荐名录里还有 ${entries.length} 台值得看`}
      </summary>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        下面是选购指南里同价位段收录的机型。这一层只有价位段和真实优缺点，
        没有确切屏幕、重量、电池数据，所以不参与筛选，只作为参考。
        每条都能点进去看笔吧评测原文；标了「自行查证补充」的是指南里没有、
        由我们自己查到的机型。
      </p>

      <ul className="mt-4 space-y-3">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="rounded-xl border border-slate-100 bg-slate-50 p-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-slate-900">
                {entry.fullName}
              </span>
              <span className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-600">
                  {GUIDE_CATEGORY_LABELS[entry.category]}
                </span>
                <span className="text-slate-400">{formatPriceBand(entry)}</span>
                {entry.isNew && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600">
                    本期新增
                  </span>
                )}
              </span>
            </div>

            {entry.pros.map((p) => (
              <p
                key={p}
                className="mt-1 text-xs leading-5 text-slate-600"
              >
                <span className="text-emerald-600">优点 </span>
                {p}
              </p>
            ))}
            {entry.cons.map((c) => (
              <p
                key={c}
                className="mt-1 text-xs leading-5 text-slate-500"
              >
                <span className="text-rose-500">短板 </span>
                {c}
              </p>
            ))}
            {entry.notes.map((n) => (
              <p key={n} className="mt-1 text-xs leading-5 text-slate-500">
                {n}
              </p>
            ))}

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              {entry.reviewUrl ? (
                <a
                  href={entry.reviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-800"
                >
                  看笔吧评测原文
                </a>
              ) : null}
              {entry.source === "user" ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                  自行查证补充
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
