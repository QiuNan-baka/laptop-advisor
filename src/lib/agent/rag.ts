/**
 * RAG 检索层 —— 给 AI 一个「可引用的知识库」，而不是让它凭记忆瞎说
 *
 * 【为什么这个项目必须上 RAG】
 * 大模型不知道「机械革命 无界15X 2026 在双11 卖多少钱」，也不知道「哪台机器
 * 被笔吧评测室点名说散热差」。这些知识只存在于我自己的数据里。
 * 不检索就回答，模型只能编——编出来的参数就是给用户挖坑。
 *
 * 【检索策略：中文为什么不能用空格切词】
 * 中文句子没有空格，「预算六千想要轻一点的」用空白切成一个整串，
 * 用户换个说法就一个词都对不上。所以这里用 **bigram（二字滑窗）**：
 *   「预算六千」→ 预算 / 算六 / 六千
 * 只要有两个字连续相同就能命中，召回率明显高于整串匹配。
 * 英文和数字（RTX4060、1.4kg）仍按整词切，避免「4060」被拆碎。
 *
 * 【排序：BM25】
 * 不是简单的「命中次数越多越靠前」。BM25 会惩罚那些「到处都出现的词」
 * （比如每台机器都有「屏幕」），奖励「只在这一台里出现的稀有词」。
 * 检索到的每一块都会带出处，界面上能直接点回原文——这是「可解释」。
 */

import { laptops, type Laptop, type UsageTag } from "@/data/laptops";
import { formatCpu } from "@/lib/cpu";
import {
  formatPriceBand,
  GUIDE_CATEGORY_LABELS,
  guideCatalog,
  type GuideEntry,
} from "@/data/guide-catalog";

/** 知识块：检索的最小单位。一个机型 = 一块 */
export interface Chunk {
  id: string;
  /** spec=实测参数库里的一台机器；review=笔吧指南里的一条推荐 */
  kind: "spec" | "review";
  title: string;
  text: string;
  /** 出处名称，界面上显示「据 实测参数库」 */
  source: string;
  /** 可点开的原始出处（笔吧评测文章） */
  url?: string;
  laptopId?: string;
  guideId?: string;
}

/** 检索结果：命中的块 + 分数 + 命中了哪些词 */
export interface Hit {
  chunk: Chunk;
  score: number;
  matched: string[];
}

/** 界面要展示的引用 */
export interface Citation {
  id: string;
  title: string;
  source: string;
  url?: string;
  /** 命中的原文片段，让用户能核对 */
  excerpt: string;
}

const USAGE_LABELS: Record<UsageTag, string> = {
  office: "办公",
  coding: "编程",
  gaming: "游戏",
  design: "设计",
  study: "学习",
  video: "影音",
};

/** 一台实测机 → 一段可检索的文本 */
function specText(l: Laptop): string {
  const screen = [
    `${l.screen.sizeInch} 英寸 ${l.screen.resolution}`,
    `ppi ${l.screen.ppi}`,
    l.screen.panel,
    l.screen.refreshRate !== undefined ? `${l.screen.refreshRate}Hz` : "",
    l.screen.brightness !== undefined ? `亮度 ${l.screen.brightness} nit` : "",
    l.screen.colorGamut !== undefined ? `色域 ${l.screen.colorGamut}` : "",
  ]
    .filter(Boolean)
    .join("，");

  const cpu =
    l.cpu.cores !== undefined
      ? `${formatCpu(l.cpu.name)}（${l.cpu.cores} 核）`
      : formatCpu(l.cpu.name);

  return [
    `${l.brand} ${l.model}｜售价 ${l.price} 元${l.subsidyPrice !== undefined ? `（国补价 ${l.subsidyPrice} 元）` : ""}`,
    `屏幕 ${screen}`,
    `CPU ${cpu}｜显卡 ${l.gpu}`,
    `内存 ${l.ram}GB${l.storage !== undefined ? `｜硬盘 ${l.storage}GB` : ""}`,
    `重量 ${l.weight}kg${l.battery !== undefined ? `｜电池 ${l.battery}Wh` : ""}`,
    l.ports?.length ? `接口 ${l.ports.join("、")}` : "",
    l.tags.length ? `适用 ${l.tags.map((t) => USAGE_LABELS[t]).join("、")}` : "",
    `优点 ${l.highlights.join("；")}`,
    `短板 ${l.drawbacks.join("；")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** 一条笔吧推荐 → 一段可检索的文本 */
function reviewText(g: GuideEntry): string {
  return [
    `${g.fullName}｜${GUIDE_CATEGORY_LABELS[g.category]}｜价位 ${formatPriceBand(g)}`,
    g.isNew ? "本期新增机型" : "",
    g.pros.length ? `优势 ${g.pros.join("；")}` : "",
    g.cons.length ? `劣势 ${g.cons.join("；")}` : "",
    g.notes.length ? `备注 ${g.notes.join("；")}` : "",
    g.params.length ? `参数 ${g.params.join("、")}` : "",
    g.source === "user" ? "（这条不在笔吧指南原文里，是我们自己查证补充的）" : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** 全量知识块。实测精修机 + 笔吧带参数机（spec）+ 笔吧推荐名录（review），进程启动时构建一次，之后常驻内存 */
export const chunks: Chunk[] = [
  ...laptops.map<Chunk>((l) => ({
    id: `spec:${l.id}`,
    kind: "spec",
    title: `${l.brand} ${l.model}`,
    text: specText(l),
    source: "实测参数库",
    laptopId: l.id,
  })),
  ...guideCatalog.map<Chunk>((g) => ({
    id: `review:${g.id}`,
    kind: "review",
    title: g.fullName,
    text: reviewText(g),
    source: "笔吧评测室选购指南",
    url: g.reviewUrl,
    guideId: g.id,
  })),
];

/**
 * 查询扩展：用户嘴里的词和资料里的词经常不是同一个。
 * 「续航」在资料里写的是「电池」，「轻」写的是「重量」。
 * 不做这一步，问「哪台续航久」会一条都检索不到。
 */
const SYNONYMS: Record<string, string[]> = {
  续航: ["电池", "Wh", "续航"],
  轻: ["重量", "kg", "便携"],
  便携: ["重量", "kg", "轻薄"],
  屏幕: ["分辨率", "屏幕", "英寸", "ppi"],
  清晰: ["ppi", "分辨率", "清晰度"],
  独立显卡: ["显卡", "独显", "RTX"],
  独显: ["显卡", "RTX", "GTX"],
  游戏: ["游戏", "刷新率", "独显"],
  散热: ["散热", "短板", "风扇"],
  噪音: ["风扇", "安静", "共振"],
  接口: ["接口", "USB", "雷电", "HDMI"],
  键盘: ["键盘", "手感", "键程"],
  触控板: ["触控板", "玻璃"],
  性价比: ["价位", "便宜", "同价位"],
  学生: ["学习", "上课", "学生"],
  编程: ["编程", "内存", "代码"],
  剪辑: ["剪辑", "独显", "色域"],
  屏幕素质: ["亮度", "色域", "nit"],
};

/** 中文滑窗切二字词；英文数字按整词切 */
export function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const tokens: string[] = [];

  // 英文 / 数字 / 带单位的数值。
  // 注意这里一定要把「字母+数字」算成一整个词：
  //   RTX4060 → rtx4060（同时再补 rtx / 4060，兼容数据里写成 "RTX 4060" 的情况）
  //   1.4kg   → 1.4kg（同时补 1.4，兼容数据里写成 "1.4 kg" 的情况）
  // 否则 "rtx4060" 被切成 rtx + 4060 两个碎片，跟任何一边都撞不上。
  const latin = lower.match(/[a-z]+[0-9]*(?:\.[0-9]+)?[a-z]*|[0-9]+(?:\.[0-9]+)?[a-z]*/g);
  if (latin) {
    for (const w of latin) {
      tokens.push(w);
      // 混合词再拆一次，两种写法都能命中
      if (/[a-z]/.test(w) && /[0-9]/.test(w)) {
        const parts = w.match(/[a-z]+|[0-9]+(?:\.[0-9]+)?/g);
        if (parts && parts.length > 1) tokens.push(...parts);
      }
    }
  }

  // 中文按连续片段切 bigram
  for (const seg of lower.replace(/[^\u4e00-\u9fa5]+/g, " ").split(" ")) {
    if (!seg) continue;
    if (seg.length === 1) {
      tokens.push(seg);
      continue;
    }
    for (let i = 0; i + 1 < seg.length; i += 1) {
      tokens.push(seg.slice(i, i + 2));
    }
  }

  return tokens;
}

/** 把查询词扩展成「用户词 + 同义词」 */
function expandQuery(query: string): string {
  const extra: string[] = [];
  for (const [key, words] of Object.entries(SYNONYMS)) {
    if (query.includes(key)) extra.push(...words);
  }
  return extra.length ? `${query} ${extra.join(" ")}` : query;
}

// ---- BM25 索引：启动时算一次 ----
interface Index {
  /** 每块的 token → 出现次数 */
  tfs: Map<string, number>[];
  /** 每块的长度 */
  lens: number[];
  /** 词 → 出现在多少块里 */
  df: Map<string, number>;
  avgLen: number;
}

const index: Index = (() => {
  const tfs: Map<string, number>[] = [];
  const lens: number[] = [];
  const df = new Map<string, number>();
  let total = 0;

  for (const chunk of chunks) {
    const tokens = tokenize(`${chunk.title} ${chunk.text}`);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    tfs.push(tf);
    lens.push(tokens.length);
    total += tokens.length;
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  }

  return { tfs, lens, df, avgLen: total / Math.max(chunks.length, 1) };
})();

const K1 = 1.5;
const B = 0.75;
const N = chunks.length;

function idf(token: string): number {
  const df = index.df.get(token) ?? 0;
  // 标准 BM25 的 idf 变体，恒为正
  return Math.log(1 + (N - df + 0.5) / (df + 0.5));
}

/**
 * 检索入口。
 * @param query   用户/Agent 的自然语言查询
 * @param limit   返回块数
 * @param minScore 低于此分视为不相关（避免"什么都返回一点"）
 */
export function searchKnowledge(
  query: string,
  limit = 5,
  minScore = 1.2
): Hit[] {
  const q = query.trim();
  if (!q) return [];

  const qTokens = tokenize(expandQuery(q));
  if (qTokens.length === 0) return [];

  // 去重，避免长查询里重复词把分数重复加
  const unique = [...new Set(qTokens)];
  const hits: Hit[] = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const tf = index.tfs[i];
    const dl = index.lens[i];
    let score = 0;
    const matched: string[] = [];

    for (const t of unique) {
      const f = tf.get(t);
      if (!f) continue;
      const denom = f + K1 * (1 - B + (B * dl) / index.avgLen);
      score += idf(t) * ((f * (K1 + 1)) / denom);
      matched.push(t);
    }

    if (score >= minScore) {
      hits.push({ chunk: chunks[i], score, matched });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

/** 把检索结果压成给模型看的文本（省 token，格式稳定） */
export function formatHitsForModel(hits: Hit[]): string {
  if (hits.length === 0) {
    return "没有检索到相关资料。请如实告诉用户你不知道，不要编造。";
  }
  return hits
    .map(
      (h, i) =>
        `[资料${i + 1}] ${h.chunk.title}（来源：${h.chunk.source}）\n${h.chunk.text}`
    )
    .join("\n\n");
}

/** 检索结果 → 界面引用列表 */
export function toCitations(hits: Hit[]): Citation[] {
  return hits.map((h) => ({
    id: h.chunk.id,
    title: h.chunk.title,
    source: h.chunk.source,
    url: h.chunk.url,
    // 截一段命中原文，让用户能核对，而不是只能选择相信
    excerpt: h.chunk.text.replace(/\n/g, " · ").slice(0, 160),
  }));
}
