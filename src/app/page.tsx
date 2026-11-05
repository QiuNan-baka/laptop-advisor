"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AgentChat from "@/components/AgentChat";
import AiGuessYouLike from "@/components/AiGuessYouLike";
import AnalysisStage from "@/components/AnalysisStage";
import ConstraintPanel from "@/components/ConstraintPanel";
import GuideList from "@/components/GuideList";
import ResultByCategory from "@/components/ResultByCategory";
import RelaxNotice from "@/components/RelaxNotice";
import RequirementInput from "@/components/RequirementInput";
import FavoritesPanel from "@/components/FavoritesPanel";
import LandingPage from "@/components/LandingPage";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import TranslationStatus from "@/components/TranslationStatus";
import MouseConstraintPanel from "@/components/MouseConstraintPanel";
import MouseGuessYouLike from "@/components/MouseGuessYouLike";
import MouseResultList from "@/components/MouseResultList";
import KeyboardConstraintPanel from "@/components/KeyboardConstraintPanel";
import KeyboardGuessYouLike from "@/components/KeyboardGuessYouLike";
import KeyboardResultList from "@/components/KeyboardResultList";
import MonitorConstraintPanel from "@/components/MonitorConstraintPanel";
import MonitorGuessYouLike from "@/components/MonitorGuessYouLike";
import MonitorResultList from "@/components/MonitorResultList";
import { dictionary, type Constraints } from "@/data/dictionary";
import { categoryMeta, DEFAULT_CATEGORY, type CategoryId } from "@/data/categories";
import { guideCatalog } from "@/data/guide-catalog";
import { laptops } from "@/data/laptops";
import { mice } from "@/data/mouse-specs";
import { keyboards } from "@/data/keyboard-specs";
import { monitors } from "@/data/monitor-specs";
import { mouseDictionary } from "@/data/mouse-dictionary";
import { keyboardDictionary } from "@/data/keyboard-dictionary";
import { monitorDictionary } from "@/data/monitor-dictionary";
import {
  probeProvider,
  requestParse,
  requestParseKeyboard,
  requestParseMonitor,
  requestParseMouse,
} from "@/lib/ai/api-client";
import type { Trace, UnifiedParseResult } from "@/lib/ai/types";
import {
  categoryFromUsages,
  filterByCategory,
  guideNearBudget,
} from "@/lib/guide";
import { match } from "@/lib/match";
import {
  matchMice,
  type MouseMatchOutcome,
  type MouseParseResult,
} from "@/lib/mouse-match";
import {
  matchKeyboards,
  type KeyboardMatchOutcome,
  type KeyboardParseResult,
} from "@/lib/keyboard-match";
import {
  matchMonitors,
  type MonitorMatchOutcome,
  type MonitorParseResult,
} from "@/lib/monitor-match";
import type { MouseUnifiedParseResult } from "@/lib/ai/mouse-parse";
import type { KeyboardUnifiedParseResult } from "@/lib/ai/keyboard-parse";
import type { MonitorUnifiedParseResult } from "@/lib/ai/monitor-parse";
import type { MouseConstraints } from "@/data/mouse-dictionary";
import type { KeyboardConstraints } from "@/data/keyboard-dictionary";
import type { MonitorConstraints } from "@/data/monitor-dictionary";
import type { ConstraintPatch } from "@/lib/agent/tools";
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
  const [mouseResult, setMouseResult] = useState<MouseUnifiedParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // 每次发新请求自增，作为 AnalysisStage 的 key 强制重新挂载，进度条从第 1 步重来
  const [parseSeq, setParseSeq] = useState(0);
  // 是否打开「我的收藏」二级界面
  const [showFavorites, setShowFavorites] = useState(false);
  // 是否已经进入二级界面（主应用）。false = 停留在一级落地页。
  const [entered, setEntered] = useState(false);
  // 当前推荐类目（笔记本/键盘/鼠标/显示器）
  const [category, setCategory] = useState<CategoryId>(DEFAULT_CATEGORY);

  // —— 鼠标类目（纯本地词典，不走大模型）——
  const [mouseConstraints, setMouseConstraints] = useState<MouseConstraints>({});
  const [mouseTraces, setMouseTraces] = useState<MouseParseResult["traces"]>([]);
  const [mouseSubmitted, setMouseSubmitted] = useState(false);
  const [mouseLoading, setMouseLoading] = useState(false);

  // —— 键盘类目（大模型翻译，失败降级本地词典）——
  const [keyboardConstraints, setKeyboardConstraints] = useState<KeyboardConstraints>({});
  const [keyboardTraces, setKeyboardTraces] = useState<KeyboardParseResult["traces"]>([]);
  const [keyboardSubmitted, setKeyboardSubmitted] = useState(false);
  const [keyboardLoading, setKeyboardLoading] = useState(false);
  const [keyboardResult, setKeyboardResult] = useState<KeyboardUnifiedParseResult | null>(null);

  // —— 显示器类目（大模型翻译，失败降级本地词典）——
  const [monitorConstraints, setMonitorConstraints] = useState<MonitorConstraints>({});
  const [monitorTraces, setMonitorTraces] = useState<MonitorParseResult["traces"]>([]);
  const [monitorSubmitted, setMonitorSubmitted] = useState(false);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [monitorResult, setMonitorResult] = useState<MonitorUnifiedParseResult | null>(null);

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

  // 鼠标结果：纯本地词典解析 + 规则引擎，也是纯函数
  const mouseOutcome = useMemo<MouseMatchOutcome>(
    () => matchMice(mouseConstraints),
    [mouseConstraints]
  );

  // 键盘结果：纯本地词典 + 规则引擎
  const keyboardOutcome = useMemo<KeyboardMatchOutcome>(
    () => matchKeyboards(keyboardConstraints),
    [keyboardConstraints]
  );

  // 显示器结果：纯本地词典 + 规则引擎
  const monitorOutcome = useMemo<MonitorMatchOutcome>(
    () => matchMonitors(monitorConstraints),
    [monitorConstraints]
  );

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
    if (constraints.budgetMin) parts.push(`预算下限 ${constraints.budgetMin} 元`);
    if (constraints.budgetMax) parts.push(`预算上限 ${constraints.budgetMax} 元`);
    if (constraints.weightMax) parts.push(`重量不超过 ${constraints.weightMax}kg`);
    if (constraints.screenSizeMin) parts.push(`屏幕至少 ${constraints.screenSizeMin} 英寸`);
    if (constraints.screenSizeMax) parts.push(`屏幕不超过 ${constraints.screenSizeMax} 英寸`);
    if (constraints.ppiMin) parts.push(`像素密度不低于 ${constraints.ppiMin}ppi`);
    if (constraints.ramMin) parts.push(`内存至少 ${constraints.ramMin}GB`);
    if (constraints.storageMin) parts.push(`硬盘至少 ${constraints.storageMin}GB`);
    if (constraints.batteryMin) parts.push(`电池至少 ${constraints.batteryMin}Wh`);
    if (constraints.refreshMin) parts.push(`刷新率至少 ${constraints.refreshMin}Hz`);
    if (constraints.requireDiscreteGpu) parts.push("需要独显");
    if (constraints.preferEfficient) parts.push("优先高能效芯片（续航久）");
    if (constraints.preferStrongIGpu) parts.push("轻度游戏，优先强核显");
    if (constraints.usages?.length) parts.push(`用途 ${constraints.usages.join("/")}`);
    if (constraints.brands?.length) parts.push(`品牌 ${constraints.brands.join("/")}`);
    if (constraints.models?.length) parts.push(`机型 ${constraints.models.join("/")}`);

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

      // 鼠标类目：走大模型翻译（模糊概念靠大模型分辨），失败自动降级本地词典
      if (category === "mouse") {
        inFlight.current?.abort();
        const controller = new AbortController();
        inFlight.current = controller;

        setMouseLoading(true);
        setError(null);

        const res = await requestParseMouse(input, {
          userKey,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setMouseLoading(false);

        if (!res.ok) {
          setError(
            res.error.retryAfterSec
              ? `${res.error.message}（还需要等 ${res.error.retryAfterSec} 秒）`
              : res.error.message
          );
          return;
        }

        setMouseResult(res.data);
        setMouseConstraints(res.data.constraints);
        setMouseTraces(res.data.traces);
        setMouseSubmitted(true);
        return;
      }

      // 键盘类目：走大模型翻译（模糊概念靠大模型分辨），失败自动降级本地词典
      if (category === "keyboard") {
        inFlight.current?.abort();
        const controller = new AbortController();
        inFlight.current = controller;

        setKeyboardLoading(true);
        setError(null);

        const res = await requestParseKeyboard(input, {
          userKey,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setKeyboardLoading(false);

        if (!res.ok) {
          setError(
            res.error.retryAfterSec
              ? `${res.error.message}（还需要等 ${res.error.retryAfterSec} 秒）`
              : res.error.message
          );
          return;
        }

        setKeyboardResult(res.data);
        setKeyboardConstraints(res.data.constraints);
        setKeyboardTraces(res.data.traces);
        setKeyboardSubmitted(true);
        return;
      }

      // 显示器类目：走大模型翻译，失败自动降级本地词典
      if (category === "monitor") {
        inFlight.current?.abort();
        const controller = new AbortController();
        inFlight.current = controller;

        setMonitorLoading(true);
        setError(null);

        const res = await requestParseMonitor(input, {
          userKey,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setMonitorLoading(false);

        if (!res.ok) {
          setError(
            res.error.retryAfterSec
              ? `${res.error.message}（还需要等 ${res.error.retryAfterSec} 秒）`
              : res.error.message
          );
          return;
        }

        setMonitorResult(res.data);
        setMonitorConstraints(res.data.constraints);
        setMonitorTraces(res.data.traces);
        setMonitorSubmitted(true);
        return;
      }

      // 取消上一次还没回来的请求，避免“后发先至”把旧结果盖上来
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      setLoading(true);
      setError(null);
      setParseSeq((n) => n + 1);

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
    [userKey, category]
  );

  function removeConstraint(key: keyof Constraints) {
    setConstraints((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function removeMouseConstraint(key: keyof MouseConstraints) {
    setMouseConstraints((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function removeKeyboardConstraint(key: keyof KeyboardConstraints) {
    setKeyboardConstraints((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function removeMonitorConstraint(key: keyof MonitorConstraints) {
    setMonitorConstraints((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  /**
   * 用户点了「同步至匹配结果」：把 Agent 提议的条件变更合并进当前约束。
   *
   * 合并规则（守底线）：
   * - set 里的键覆盖/新增；clear 里的键删除。
   * - 这里只做「机械合并」，不额外判断语义。真正的语义把关在 update_constraints
   *   工具那一层：它被 prompt 约束为「只在用户明确说改条件时才调用、只改用户
   *   提到的键」。所以到这里时，patch 已经是用户拍过板要改的内容。
   * - 触发重新筛选：条件一变，outcome 由 useMemo([constraints]) 自动重算，
   *   这里 setSubmitted(true) 只是确保结果区/名录区继续渲染。
   */
  const applyConstraints = useCallback((patch: ConstraintPatch) => {
    setConstraints((prev) => {
      const next: Constraints = { ...prev };
      if (patch.clear) {
        for (const k of patch.clear) delete next[k];
      }
      if (patch.set) {
        for (const [k, v] of Object.entries(patch.set)) {
          if (v !== undefined) {
            (next as Record<string, unknown>)[k] = v;
          }
        }
      }
      return next;
    });
    setSubmitted(true);
  }, []);

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
    setMouseConstraints({});
    setMouseTraces([]);
    setMouseSubmitted(false);
    setMouseLoading(false);
    setMouseResult(null);
    setKeyboardConstraints({});
    setKeyboardTraces([]);
    setKeyboardSubmitted(false);
    setKeyboardLoading(false);
    setKeyboardResult(null);
    setMonitorConstraints({});
    setMonitorTraces([]);
    setMonitorSubmitted(false);
    setMonitorLoading(false);
    setMonitorResult(null);
  }

  /** 切换推荐类目：重置已筛出的结果，但保留输入框文本与 Key */
  function switchCategory(id: CategoryId) {
    if (id === category) return;
    setCategory(id);
    inFlight.current?.abort();
    inFlight.current = null;
    setConstraints({});
    setTraces([]);
    setResult(null);
    setError(null);
    setLoading(false);
    setSubmitted(false);
    setMouseConstraints({});
    setMouseTraces([]);
    setMouseSubmitted(false);
    setMouseLoading(false);
    setMouseResult(null);
    setKeyboardConstraints({});
    setKeyboardTraces([]);
    setKeyboardSubmitted(false);
    setKeyboardLoading(false);
    setKeyboardResult(null);
    setMonitorConstraints({});
    setMonitorTraces([]);
    setMonitorSubmitted(false);
    setMonitorLoading(false);
    setMonitorResult(null);
  }

  const total = outcome.results.length + outcome.overBudget.length;
  const meta = categoryMeta(category);
  const isLaptop = category === "laptop";
  const isMouse = category === "mouse";
  const isKeyboard = category === "keyboard";
  const isMonitor = category === "monitor";
  // 例区与 placeholder 都随类目走
  const examples = meta.examples;
  const placeholder = meta.placeholder;

  const mouseTotal = mouseOutcome.results.length + mouseOutcome.overBudget.length;
  const keyboardTotal = keyboardOutcome.results.length + keyboardOutcome.overBudget.length;
  const monitorTotal = monitorOutcome.results.length + monitorOutcome.overBudget.length;

  // 一级落地页：未进入前只显示主题页
  if (!entered) {
    return <LandingPage onEnter={() => setEntered(true)} />;
  }

  return (
    <div className="min-h-full text-slate-900">
      <main className="mx-auto w-full max-w-4xl px-5 py-12">
        {/* 左上角：返回一级界面 */}
        <button
          type="button"
          onClick={() => setEntered(false)}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-amber-700"
        >
          <span aria-hidden>←</span> 返回
        </button>

        <SiteHeader
          onOpenFavorites={() => setShowFavorites(true)}
          activeCategory={category}
          onSwitchCategory={switchCategory}
        />

        <RequirementInput
          text={text}
          onTextChange={setText}
          onParse={runParse}
          onReset={reset}
          examples={examples}
          loading={isMouse ? mouseLoading : isKeyboard ? keyboardLoading : isMonitor ? monitorLoading : loading}
          error={error}
          userKey={userKey}
          onUserKeyChange={setUserKey}
          question={meta.question}
          placeholder={placeholder}
        />

        {isMouse && <MouseGuessYouLike />}
        {isKeyboard && <KeyboardGuessYouLike />}
        {isMonitor && <MonitorGuessYouLike />}

        <AgentChat
          seedContext={seedContext}
          userKey={userKey}
          available={!demoMode}
          onApplyConstraints={applyConstraints}
        />

        {isLaptop && <AiGuessYouLike enabled={isLaptop} />}

        <AnalysisStage
          key={parseSeq}
          active={isMouse ? mouseLoading : isKeyboard ? keyboardLoading : isMonitor ? monitorLoading : loading}
          elapsedMs={result?.elapsedMs}
        />

        {isLaptop && result && (
          <TranslationStatus result={result} demoMode={demoMode} />
        )}

        {/* 鼠标类目：大模型翻译状态条（与笔记本同款） */}
        {isMouse && mouseResult && (
          <TranslationStatus result={mouseResult} demoMode={demoMode} />
        )}

        {/* 键盘类目：大模型翻译状态条 */}
        {isKeyboard && keyboardResult && (
          <TranslationStatus result={keyboardResult} demoMode={demoMode} />
        )}

        {/* 显示器类目：大模型翻译状态条 */}
        {isMonitor && monitorResult && (
          <TranslationStatus result={monitorResult} demoMode={demoMode} />
        )}

        {isLaptop && submitted && (
          <ConstraintPanel
            constraints={constraints}
            traces={traces}
            onRemove={removeConstraint}
          />
        )}

        {/* —— 鼠标类目：本地词典解析的结果面板 + 匹配结果 —— */}
        {isMouse && mouseSubmitted && (
          <MouseConstraintPanel
            constraints={mouseConstraints}
            traces={mouseTraces}
            onRemove={removeMouseConstraint}
          />
        )}

        {isMouse && mouseSubmitted && mouseOutcome.didRelax && (
          <RelaxNotice
            resultsCount={mouseOutcome.results.length}
            relaxLog={mouseOutcome.relaxLog}
          />
        )}

        {isMouse && mouseSubmitted && mouseTotal > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              {mouseOutcome.results.length > 0
                ? `匹配到 ${mouseOutcome.results.length} 款`
                : `预算内 0 款 · 以下是超预算、但其他条件都满足的 ${mouseOutcome.overBudget.length} 款`}
            </h2>
            <MouseResultList
              items={[...mouseOutcome.overBudget, ...mouseOutcome.results]}
            />
          </section>
        )}

        {/* —— 键盘类目 —— */}
        {isKeyboard && keyboardSubmitted && (
          <KeyboardConstraintPanel
            constraints={keyboardConstraints}
            traces={keyboardTraces}
            onRemove={removeKeyboardConstraint}
          />
        )}

        {isKeyboard && keyboardSubmitted && keyboardOutcome.didRelax && (
          <RelaxNotice
            resultsCount={keyboardOutcome.results.length}
            relaxLog={keyboardOutcome.relaxLog}
          />
        )}

        {isKeyboard && keyboardSubmitted && keyboardTotal > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              {keyboardOutcome.results.length > 0
                ? `匹配到 ${keyboardOutcome.results.length} 款`
                : `预算内 0 款 · 以下是超预算、但其他条件都满足的 ${keyboardOutcome.overBudget.length} 款`}
            </h2>
            <KeyboardResultList
              items={[...keyboardOutcome.overBudget, ...keyboardOutcome.results]}
            />
          </section>
        )}

        {/* —— 显示器类目 —— */}
        {isMonitor && monitorSubmitted && (
          <MonitorConstraintPanel
            constraints={monitorConstraints}
            traces={monitorTraces}
            onRemove={removeMonitorConstraint}
          />
        )}

        {isMonitor && monitorSubmitted && monitorOutcome.didRelax && (
          <RelaxNotice
            resultsCount={monitorOutcome.results.length}
            relaxLog={monitorOutcome.relaxLog}
          />
        )}

        {isMonitor && monitorSubmitted && monitorTotal > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              {monitorOutcome.results.length > 0
                ? `匹配到 ${monitorOutcome.results.length} 款`
                : `预算内 0 款 · 以下是超预算、但其他条件都满足的 ${monitorOutcome.overBudget.length} 款`}
            </h2>
            <MonitorResultList
              items={[...monitorOutcome.overBudget, ...monitorOutcome.results]}
            />
          </section>
        )}

        {isLaptop && submitted && outcome.didRelax && (
          <RelaxNotice
            resultsCount={outcome.results.length}
            relaxLog={outcome.relaxLog}
          />
        )}

        {isLaptop && submitted && total > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              {outcome.results.length > 0
                ? `匹配到 ${outcome.results.length} 台`
                : `预算内 0 台 · 以下是超预算、但其他条件都满足的 ${outcome.overBudget.length} 台`}
            </h2>
            <ResultByCategory
              items={[...outcome.overBudget, ...outcome.results]}
            />
          </section>
        )}

        {isLaptop && submitted && guideEntries.length > 0 && (
          <GuideList
            entries={guideEntries}
            budget={constraints.budgetMax}
          />
        )}

        {!isLaptop && !isMouse && !isKeyboard && !isMonitor && (
          <section className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white/50 p-8 text-center">
            <p className="text-sm text-slate-400">
              「{meta.menuLabel}」的机型库与需求词典数据待补充，翻译检索功能已就绪，
              等你提供数据后即可接入。
            </p>
          </section>
        )}

        <SiteFooter
          laptopCount={
            isLaptop ? laptops.length :
            isMouse ? mice.length :
            isKeyboard ? keyboards.length :
            isMonitor ? monitors.length : 0
          }
          dictionaryCount={
            isLaptop ? dictionary.length :
            isMouse ? mouseDictionary.length :
            isKeyboard ? keyboardDictionary.length :
            isMonitor ? monitorDictionary.length : 0
          }
          guideCount={isLaptop ? guideCatalog.length : 0}
        />
      </main>

      {showFavorites && (
        <FavoritesPanel onClose={() => setShowFavorites(false)} />
      )}
    </div>
  );
}
