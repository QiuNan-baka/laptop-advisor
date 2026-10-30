"use client";

import { useMemo, useState } from "react";
import ConstraintPanel from "@/components/ConstraintPanel";
import LaptopCard from "@/components/LaptopCard";
import RelaxNotice from "@/components/RelaxNotice";
import RequirementInput from "@/components/RequirementInput";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { dictionary, type Constraints } from "@/data/dictionary";
import { laptops } from "@/data/laptops";
import { match, parseRequirement, type ParseResult } from "@/lib/match";

const EXAMPLES = [
  "预算 6000 以内，主要写代码，屏幕要看得清，最好轻一点",
  "打游戏，预算 8000 左右，屏幕要爽",
  "上课用，一天不用充电，背着不累",
  "剪视频，要独显，内存大一点",
];

/**
 * 页面编排层：只管状态，不管样式。
 * 输入 → 翻译成约束 → 规则引擎筛选 → 展示（含自动放宽提示）。
 */
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

  function reset() {
    setText("");
    setConstraints({});
    setTraces([]);
    setSubmitted(false);
  }

  const total = outcome.results.length + outcome.overBudget.length;

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <main className="mx-auto w-full max-w-4xl px-5 py-12">
        <SiteHeader />

        <RequirementInput
          text={text}
          onTextChange={setText}
          onParse={runParse}
          onReset={reset}
          examples={EXAMPLES}
        />

        {submitted && (
          <ConstraintPanel
            constraints={constraints}
            traces={traces}
            onRemove={removeConstraint}
          />
        )}

        {submitted && outcome.didRelax && (
          <RelaxNotice
            resultsCount={outcome.results.length}
            relaxLog={outcome.relaxLog}
          />
        )}

        {submitted && total > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              {outcome.results.length > 0
                ? `匹配到 ${outcome.results.length} 台`
                : `预算内 0 台 · 以下是超预算、但其他条件都满足的 ${outcome.overBudget.length} 台`}
            </h2>
            <div className="space-y-3">
              {[...outcome.overBudget, ...outcome.results].map((result) => (
                <LaptopCard key={result.laptop.id} result={result} />
              ))}
            </div>
          </section>
        )}

        <SiteFooter
          laptopCount={laptops.length}
          dictionaryCount={dictionary.length}
        />
      </main>
    </div>
  );
}
