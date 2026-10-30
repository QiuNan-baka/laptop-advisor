"use client";

import { useMemo, useState } from "react";
import { parseRequirement, match, type ParseResult } from "@/lib/match";
import {
  CONSTRAINT_LABELS,
  CONSTRAINT_UNITS,
  dictionary,
  type Constraints,
} from "@/data/dictionary";
import { laptops } from "@/data/laptops";

const EXAMPLES = [
  "预算 6000 以内，主要写代码，屏幕要看得清，最好轻一点",
  "打游戏，预算 8000 左右，屏幕要爽",
  "上课用，一天不用充电，背着不累",
  "剪视频，要独显，内存大一点",
];

const USAGE_NAMES: Record<string, string> = {
  office: "办公",
  coding: "写代码",
  gaming: "游戏",
  design: "设计/剪辑",
  study: "上课",
  video: "看剧",
};

/** 把一条约束的值渲染成人话 */
function renderConstraintValue(key: keyof Constraints, value: unknown): string {
  if (key === "usages") {
    return (value as string[]).map((v) => USAGE_NAMES[v] ?? v).join("、");
  }
  if (typeof value === "boolean") return "";
  const unit = CONSTRAINT_UNITS[key] ?? "";
  return `${value}${unit}`;
}

export default function Home() {
  const [text, setText] = useState("");
  const [constraints, setConstraints] = useState<Constraints>({});
  const [traces, setTraces] = useState<ParseResult["traces"]>([]);
  const [submitted, setSubmitted] = useState(false);

  const outcome = useMemo(() => match(constraints), [constraints]);

  function runParse(input: string) {
    const parsed = parseRequirement(input);
    setConstraints(parsed.constraints);
    setTraces(parsed.traces);
    setSubmitted(true);
  }

  function removeConstraint(key: keyof Constraints) {
    setConstraints((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  const constraintEntries = Object.entries(constraints).filter(
    ([, v]) => v !== undefined
  ) as [keyof Constraints, unknown][];

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <main className="mx-auto w-full max-w-4xl px-5 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            说人话，选笔记本
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            你不需要懂参数。说清楚你要拿它干什么，我把这句话翻译成可以验证的条件，
            <span className="text-slate-700">并且把翻译过程摊开给你看</span>
            ——哪条理解错了，你直接删掉。
          </p>
        </header>

        {/* 输入区 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="requirement"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            你想用这台笔记本做什么？
          </label>
          <textarea
            id="requirement"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="例如：预算 6000 以内，平时写代码，屏幕要看得清，最好轻一点"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none focus:border-slate-400 focus:bg-white"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => runParse(text)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              翻译成条件
            </button>
            <button
              type="button"
              onClick={() => {
                setText("");
                setConstraints({});
                setTraces([]);
                setSubmitted(false);
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              重来
            </button>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs text-slate-400">试试这些说法：</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setText(ex);
                    runParse(ex);
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1 text-left text-xs text-slate-500 transition hover:border-slate-400 hover:text-slate-800"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 翻译结果：让翻译过程可见、可修改 */}
        {submitted && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-slate-800">
                我理解到的条件
              </h2>
              <span className="text-xs text-slate-400">
                共 {constraintEntries.length} 条，可逐条删除
              </span>
            </div>

            {constraintEntries.length === 0 ? (
              <p className="text-sm text-slate-400">
                没识别出任何条件。试着说具体一点，比如「预算 6000」「要轻」「打游戏」。
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {constraintEntries.map(([key, value]) => {
                    const valueText = renderConstraintValue(key, value);
                    return (
                      <span
                        key={key}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                      >
                        <span className="text-slate-400">
                          {CONSTRAINT_LABELS[key]}
                        </span>
                        {valueText && (
                          <span className="font-medium">{valueText}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeConstraint(key)}
                          aria-label={`删除条件 ${CONSTRAINT_LABELS[key]}`}
                          className="ml-0.5 rounded-full px-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>

                {traces.length > 0 && (
                  <details className="mt-4 rounded-xl bg-slate-50 p-3">
                    <summary className="cursor-pointer text-xs font-medium text-slate-600">
                      看看我是怎么翻译的（{traces.length} 条依据）
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {traces.map((t) => (
                        <li
                          key={t.label}
                          className="text-xs leading-5 text-slate-500"
                        >
                          <span className="font-medium text-slate-700">
                            {t.label}：
                          </span>
                          {t.explain}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
          </section>
        )}

        {/* 自主决策提示：结果为空时自动放宽 */}
        {submitted && outcome.didRelax && (
          <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              {outcome.results.length > 0
                ? "没有机型同时满足全部条件，我自动放宽了部分条件"
                : "在你给的预算内没有符合条件的机型，我没有擅自改你的预算"}
            </p>
            <ul className="mt-2 space-y-1">
              {outcome.relaxLog.map((line) => (
                <li key={line} className="text-xs text-amber-700">
                  · {line}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 结果列表 */}
        {submitted && (outcome.results.length > 0 || outcome.overBudget.length > 0) && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              {outcome.results.length > 0
                ? `匹配到 ${outcome.results.length} 台`
                : `预算内 0 台 · 以下是超预算、但其他条件都满足的 ${outcome.overBudget.length} 台`}
            </h2>
            <div className="space-y-3">
              {[...outcome.overBudget, ...outcome.results].map(({ laptop, reason, overBudgetBy }) => (
                <article
                  key={laptop.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      {laptop.brand} {laptop.model}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        ¥{laptop.price}
                      </span>
                      {overBudgetBy !== undefined && (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-600">
                          超预算 ¥{overBudgetBy}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-1 text-xs text-slate-400">{reason}</p>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-3">
                    <Spec
                      label="屏幕"
                      value={`${laptop.screen.sizeInch}" ${laptop.screen.resolution}`}
                    />
                    <Spec label="清晰度" value={`${laptop.screen.ppi} ppi`} />
                    <Spec
                      label="刷新率"
                      value={`${laptop.screen.refreshRate} Hz`}
                    />
                    <Spec label="内存" value={`${laptop.ram} GB`} />
                    <Spec label="硬盘" value={`${laptop.storage} GB`} />
                    <Spec label="重量" value={`${laptop.weight} kg`} />
                  </div>

                  <div className="mt-3 space-y-1">
                    {laptop.highlights.map((h) => (
                      <p key={h} className="text-xs leading-5 text-slate-600">
                        <span className="text-emerald-600">优点 </span>
                        {h}
                      </p>
                    ))}
                    {laptop.drawbacks.map((d) => (
                      <p key={d} className="text-xs leading-5 text-slate-500">
                        <span className="text-rose-500">短板 </span>
                        {d}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-10 text-center text-xs leading-5 text-slate-400">
          机型库共 {laptops.length} 台 · 需求词典 {dictionary.length} 条 ·
          所有参数来自机型库，AI 只负责解释参数对你意味着什么，不生成参数。
        </footer>
      </main>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <span className="text-slate-400">{label}</span>
      <span>{value}</span>
    </div>
  );
}
