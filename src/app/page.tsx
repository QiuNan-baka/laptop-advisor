"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AgentChat from "@/components/AgentChat";
import ConstraintPanel from "@/components/ConstraintPanel";
import GuideList from "@/components/GuideList";
import LaptopCard from "@/components/LaptopCard";
import RelaxNotice from "@/components/RelaxNotice";
import RequirementInput from "@/components/RequirementInput";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import TranslationStatus from "@/components/TranslationStatus";
import { dictionary, type Constraints } from "@/data/dictionary";
import { guideCatalog } from "@/data/guide-catalog";
import { laptops } from "@/data/laptops";
import { probeProvider, requestParse } from "@/lib/ai/api-client";
import type { Trace, UnifiedParseResult } from "@/lib/ai/types";
import {
  categoryFromUsages,
  filterByCategory,
  guideNearBudget,
} from "@/lib/guide";
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

  // 名录参考：和硬筛选完全独立，只在有预算或用途时给同价位参考
  const guideEntries = useMemo(() => {
    if (!submitted) return [];
    const near = guideNearBudget(constraints.budgetMax, constraints.usages);
    const filtered = filterByCategory(near, categoryFromUsages(constraints.usages));
    return filtered.slice(0, 8);
  }, [submitted, constraints.budgetMax, constraints.usages]);

  /**
   * 把当前约束翻译成一段人话，作为 Agent 的起点上下文。
   *
   * 【为什么要传这个】
   * 用户在页面里已经筛选过一轮了，接着问「这几台差在哪」时，
   * 如果 Agent 不知道他已经有 4 台候选，就得从头再筛一遍 —— 白烧 token 还慢。
   * 先把已确定的约束喂给它，它就能直接进入"对比/答疑"，而不是重新理解需求。
   */
  const seedContext = useMemo(() => {
    if (!submitted) return undefined;
    const parts: string[] = [];
    if (constraints.budgetMax) parts.push(`预算上限 ${constraints.budgetMax} 元`);
    if (constraints.weightMax) parts.push(`重量不超过 ${constraints.weightMax}kg`);
    if (constraints.screenSizeMin) parts.push(`屏幕至少 ${constraints.screenSizeMin} 英寸`);
    if (constraints.ppiMin) parts.push(`像素密度不低于 ${constraints.ppiMin}ppi`);
    if (constraints.ramMin) parts.push(`内存至少 ${constraints.ramMin}GB`);
    if (constraints.storageMin) parts.push(`硬盘至少 ${constraints.storageMin}GB`);
    if (constraints.batteryMin) parts.push(`电池至少 ${constraints.batteryMin}Wh`);
    if (constraints.refreshMin) parts.push(`刷新率至少 ${constraints.refreshMin}Hz`);
    if (constraints.requireDiscreteGpu) parts.push("需要独显");
    if (constraints.usages?.length) parts.push(`用途 ${constraints.usages.join("/")}`);

    const names = [...outcome.overBudget, ...outcome.results]
      .map((r) => `${r.laptop.brand} ${r.laptop.model}`)
      .slice(0, 6);
    if (names.length) parts.push(`当前已筛出 ${names.length} 台候选：${names.join("、")}`);

    if (parts.length === 0) return undefined;
    return `【用户已经确定的筛选条件】\n${parts.join("；")}`;
  }, [submitted, constraints, outcome]);

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

        {submitted && guideEntries.length > 0 && (
          <GuideList
            entries={guideEntries}
            budget={constraints.budgetMax}
          />
        )}

        {submitted && (
          <AgentChat
            seedContext={seedContext}
            userKey={userKey}
            available={!demoMode}
          />
        )}

        <SiteFooter
          laptopCount={laptops.length}
          dictionaryCount={dictionary.length}
          guideCount={guideCatalog.length}
        />
      </main>
    </div>
  );
}
