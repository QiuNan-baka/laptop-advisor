"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConstraintPanel from "@/components/ConstraintPanel";
import LaptopCard from "@/components/LaptopCard";
import RelaxNotice from "@/components/RelaxNotice";
import RequirementInput from "@/components/RequirementInput";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import TranslationStatus from "@/components/TranslationStatus";
import { dictionary, type Constraints } from "@/data/dictionary";
import { laptops } from "@/data/laptops";
import { probeProvider, requestParse } from "@/lib/ai/api-client";
import type { Trace, UnifiedParseResult } from "@/lib/ai/types";
import { match } from "@/lib/match";

const EXAMPLES = [
  "预算 6000 以内，主要写代码，屏幕要看得清，最好轻一点",
  "打游戏，预算 8000 左右，屏幕要爽",
  "上课用，一天不用充电，背着不累",
  "剪视频，要独显，内存大一点",
];

/**
 * 页面编排层：只管状态，不管样式。
 *
 * 流程：输入 → POST /api/parse（AI 翻译，失败自动降级）→ 规则引擎筛选 → 展示。
 * 这里没有任何 AI 相关的业务逻辑，只有一次网络请求和几个状态位。
 */
export default function Home() {
  const [text, setText] = useState("");
  const [userKey, setUserKey] = useState("");
  const [constraints, setConstraints] = useState<Constraints>({});
  const [traces, setTraces] = useState<Trace[]>([]);
  const [result, setResult] = useState<UnifiedParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /** 上一次请求的取消器：用户连点示例时，旧请求立刻作废 */
  const inFlight = useRef<AbortController | null>(null);

  // 进页面探一次：后端到底有没有配 Key
  useEffect(() => {
    let alive = true;
    probeProvider().then((configured) => {
      if (alive) setDemoMode(!configured);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 条件一变就重算。match 是纯函数，AI 完全不参与这一步。
  const outcome = useMemo(() => match(constraints), [constraints]);

  const runParse = useCallback(
    async (input: string) => {
      if (!input.trim()) {
        setError("先说一句你想用这台电脑做什么吧");
        return;
      }

      // 取消上一次还没回来的请求，避免“后发先至”把旧结果盖上来
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      setLoading(true);
      setError(null);

      const res = await requestParse(input, {
        userKey,
        signal: controller.signal,
      });

      // 如果这次请求已经被后来的请求取代，直接丢弃它的结果
      if (controller.signal.aborted) return;

      setLoading(false);

      if (!res.ok) {
        setError(
          res.error.retryAfterSec
            ? `${res.error.message}（还需要等 ${res.error.retryAfterSec} 秒）`
            : res.error.message
        );
        return;
      }

      setResult(res.data);
      setConstraints(res.data.constraints);
      setTraces(res.data.traces);
      setSubmitted(true);
    },
    [userKey]
  );

  function removeConstraint(key: keyof Constraints) {
    setConstraints((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function reset() {
    inFlight.current?.abort();
    inFlight.current = null;
    setText("");
    setConstraints({});
    setTraces([]);
    setResult(null);
    setError(null);
    setLoading(false);
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
          loading={loading}
          error={error}
          userKey={userKey}
          onUserKeyChange={setUserKey}
        />

        {result && (
          <TranslationStatus result={result} demoMode={demoMode} />
        )}

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
              {[...outcome.overBudget, ...outcome.results].map((item) => (
                <LaptopCard key={item.laptop.id} result={item} />
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
