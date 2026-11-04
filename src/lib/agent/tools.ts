/**
 * Agent 的工具箱 —— 5 个真正不同的能力，用 JSON Schema 声明给模型看
 *
 * 【为什么是「工具」而不是「一大段 Prompt 让它一次答完」】
 * 一次答完 = 模型只能凭训练记忆说，说错了没人拦得住。
 * 拆成工具 = 模型必须先"查"，才能"答"。查的动作有参数、有返回值、可复现。
 * 这就是「Function Calling / 工具集成」和普通聊天的本质区别：
 *   普通聊天：模型 → 文本
 *   工具调用：模型 → 结构化意图 → 代码执行 → 真实数据 → 模型 → 文本
 *
 * 【5 个工具为什么这么分】
 * 不是把一件事拆成五份，而是覆盖五类**不同的信息需求**：
 *   filter_laptops     我有哪些符合条件的机器？（广度检索）
 *   get_laptop_detail  这一台的完整参数是什么？（深度查单台）
 *   compare_laptops    这两三台到底差在哪？（横向对比）
 *   search_reviews     评测怎么说它的缺点？（定性信息，RAG）
 *   diagnose_shortage  为什么一台都没筛出来？（自我诊断，自主决策）
 *
 * 【安全】所有参数过 Zod 校验再执行。模型给越界值（weightMax: 99）会被拒收，
 * 不会进入筛选逻辑。模型不能凭空造机型 id —— id 不存在就返回"查无此机"。
 */

import { z } from "zod";
import { BOUNDS } from "@/lib/ai/schema";
import { CONSTRAINT_LABELS, CONSTRAINT_UNITS, type Constraints } from "@/data/dictionary";
import { formatRam, laptops, type Laptop } from "@/data/laptops";
import {
  formatPriceBand,
  GUIDE_CATEGORY_LABELS,
  guideCatalog,
} from "@/data/guide-catalog";
import { satisfies } from "@/lib/match";
import { formatCpu, efficiencyTier, hasStrongIGpu } from "@/lib/cpu";
import { formatHitsForModel, smartSearch, toCitations, type Citation } from "./rag";

// ---------- 工具执行结果 ----------

export interface ToolResult {
  /** 给模型看的文本 */
  content: string;
  /** 如果这次调用产生了可引用来源，带出来给界面用 */
  citations?: Citation[];
  /** 给界面「思考过程」面板显示的一句话摘要 */
  summary: string;
  /**
   * 这次调用产生的约束变更（只有 update_constraints 会带）。
   * 不回传给模型——它是给前端「是否同步至匹配结果」确认区用的。
   */
  constraintPatch?: ConstraintPatch;
}

/**
 * 约束增量变更。set=要新增/修改的条件，clear=要删除的条件键。
 * 用增量而不是「整包替换」，是因为用户追问「预算提到 7000」时，
 * 模型只该改预算这一项，不该碰用户已经定好的重量、用途。
 */
export interface ConstraintPatch {
  set?: Constraints;
  clear?: (keyof Constraints)[];
}

// ---------- 参数 Schema ----------

const num = (key: keyof typeof BOUNDS) =>
  z
    .number()
    .min(BOUNDS[key].min)
    .max(BOUNDS[key].max)
    .optional();

const UsageEnum = z.enum(["office", "coding", "gaming", "design", "study", "video"]);

const FilterArgs = z.object({
  budgetMax: num("budgetMax"),
  weightMax: num("weightMax"),
  screenSizeMin: num("screenSizeMin"),
  ppiMin: num("ppiMin"),
  refreshMin: num("refreshMin"),
  ramMin: num("ramMin"),
  storageMin: num("storageMin"),
  batteryMin: num("batteryMin"),
  preferEfficient: z.boolean().optional(),
  preferStrongIGpu: z.boolean().optional(),
  requireDiscreteGpu: z.boolean().optional(),
  usages: z.array(UsageEnum).optional(),
  brands: z.array(z.string()).optional(),
});

const DetailArgs = z.object({
  id: z.string().min(1).max(60).optional(),
  name: z.string().min(1).max(60).optional(),
});

const CompareArgs = z.object({
  ids: z.array(z.string().min(1).max(60)).min(2).max(3),
});

const ReviewArgs = z.object({
  query: z.string().min(1).max(120),
  limit: z.number().int().min(1).max(6).optional(),
});

const DiagnoseArgs = FilterArgs;

/**
 * update_constraints 的参数：一份「增量变更」。
 * set = 要新增或修改的条件（全过 BOUNDS 校验）；clear = 要删除的条件键。
 * 两者都可不填，但至少得给一个，否则这次调用没有意义。
 */
const ConstraintPatchArgs = z.object({
  set: FilterArgs.optional(),
  clear: z
    .array(
      z.enum([
        "budgetMin",
        "budgetMax",
        "weightMax",
        "screenSizeMin",
        "screenSizeMax",
        "ppiMin",
        "refreshMin",
        "ramMin",
        "storageMin",
        "batteryMin",
        "requireDiscreteGpu",
        "preferEfficient",
        "preferStrongIGpu",
        "usages",
        "brands",
      ])
    )
    .optional(),
});

// ---------- 工具声明（喂给模型的 JSON Schema） ----------

export const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "filter_laptops",
      description:
        "从「实测参数库」里按条件筛选机型。参数库里每台机器都有确切的屏幕/CPU/内存/硬盘/重量/电池数值。只传用户真正提过的条件，没提的不要传。如果返回 0 台，立刻调用 diagnose_shortage 查是哪条卡死了。",
      parameters: {
        type: "object",
        properties: {
          budgetMax: { type: "number", description: "预算上限（元）" },
          weightMax: { type: "number", description: "整机重量上限（公斤）" },
          screenSizeMin: { type: "number", description: "屏幕最小尺寸（英寸）" },
          ppiMin: { type: "number", description: "像素密度下限（ppi）。用户说「看得清/字清楚」时用这个，不要用屏幕尺寸" },
          refreshMin: { type: "number", description: "刷新率下限（Hz）" },
          ramMin: { type: "number", description: "内存下限（GB）" },
          storageMin: { type: "number", description: "硬盘下限（GB）" },
          batteryMin: { type: "number", description: "电池容量下限（Wh）" },
          preferEfficient: { type: "boolean", description: "是否优先高能效芯片（用户说「续航久/一天不用充电」时用 true，不要用 batteryMin）" },
          preferStrongIGpu: { type: "boolean", description: "是否优先强核显（用户说「轻度玩3A/偶尔玩游戏」时用 true，不强求独显；核显里只有 X7-358H/X9-388H 能带得动）" },
          requireDiscreteGpu: { type: "boolean", description: "是否需要独显（剪辑/建模/重度 3A 游戏才需要）" },
          usages: {
            type: "array",
            items: { type: "string", enum: ["office", "coding", "gaming", "design", "study", "video"] },
            description: "适用场景",
          },
          brands: {
            type: "array",
            items: { type: "string" },
            description: "品牌白名单（用户明确提到品牌时填中文品牌标签，如 联想/华硕/机械革命/苹果/ROG/红米。母品牌展开子品牌：联想含 ThinkPad+来酷、华硕含 ROG、小米含红米、戴尔含 ALIENWARE；只提子品牌则只填子品牌）",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_laptop_detail",
      description:
        "拿某一台机器的完整参数（屏幕/CPU/显卡/内存/硬盘/重量/电池/接口/优点/短板）。可以按 id 或按名称模糊查。只用于取出上面筛选结果里已经出现的机器，不能用来凭空找机型。",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "机型 id，如 cat-001" },
          name: { type: "string", description: "机型名称关键词，如 无界15X" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compare_laptops",
      description:
        "把 2-3 台机器逐项对比（价格/屏幕/性能/内存/硬盘/重量/电池），并指出每项谁更强。用于用户问「这两台差在哪」「选哪个」。",
      parameters: {
        type: "object",
        properties: {
          ids: {
            type: "array",
            items: { type: "string" },
            description: "2-3 台机器的 id",
          },
        },
        required: ["ids"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_reviews",
      description:
        "检索知识库，找机型的真实优缺点、评测意见、价位段信息。知识库包含笔吧评测室的选购指南（81 台，含优势和劣势）和实测参数库。用于回答「它有什么缺点」「同价位还有别的吗」「散热怎么样」这类定性问题。返回的每条资料都有出处。",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "检索关键词，用中文，如「轻薄本 电池 续航 缺点」" },
          limit: { type: "number", description: "返回几条，默认 5" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "diagnose_shortage",
      description:
        "当 filter_laptops 返回 0 台时调用。逐条移除约束，找出是哪一条把结果卡死了，并告诉用户放宽哪条最合理。不要用它代替筛选。",
      parameters: {
        type: "object",
        properties: {
          budgetMax: { type: "number" },
          weightMax: { type: "number" },
          screenSizeMin: { type: "number" },
          ppiMin: { type: "number" },
          refreshMin: { type: "number" },
          ramMin: { type: "number" },
          storageMin: { type: "number" },
          batteryMin: { type: "number" },
          preferEfficient: { type: "boolean" },
          requireDiscreteGpu: { type: "boolean" },
          usages: {
            type: "array",
            items: { type: "string", enum: ["office", "coding", "gaming", "design", "study", "video"] },
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_constraints",
      description:
        "把用户追问里提出的条件变更整理成结构化增量，供前端把「我理解的条件」同步到匹配结果并重新筛选。判定标准是「用户是否给了一个和当前条件不同的新数值/新要求」，不是「有没有用祈使句」——陈述句也算，比如「预算9000之内」「9000以内」「预算最多九千」「要32G内存」「轻一点两公斤以内」都是在定新边界，必须调用本工具；祈使句如「预算改成/提到 X」「加个独显」「重量不超过 X」「不要独显了/去掉重量限制」同样。纯咨询、纯对比、纯聊缺点时不要调用。set 里只放用户这次真正改动的键，没提到的键一律不写；要撤销某个条件就放 clear 数组。绝不能改动用户没提的条件。",
      parameters: {
        type: "object",
        properties: {
          set: {
            type: "object",
            description: "要新增或修改的条件，键与 filter_laptops 相同（budgetMax/weightMax/screenSizeMin/ppiMin/refreshMin/ramMin/storageMin/batteryMin/preferEfficient/preferStrongIGpu/requireDiscreteGpu/usages/brands）",
          },
          clear: {
            type: "array",
            items: {
              type: "string",
              enum: ["budgetMin", "budgetMax", "weightMax", "screenSizeMin", "screenSizeMax", "ppiMin", "refreshMin", "ramMin", "storageMin", "batteryMin", "requireDiscreteGpu", "preferEfficient", "preferStrongIGpu", "usages", "brands"],
            },
            description: "要删除的条件键（用户明确说不要/去掉某条限制时用）",
          },
        },
      },
    },
  },
];

// ---------- 描述工具执行过程的人话（给界面思考条用） ----------

export function describeCall(name: string, rawArgs: string): string {
  const a = safeJson(rawArgs);
  switch (name) {
    case "filter_laptops": {
      const parts = describeConstraints(a as Constraints);
      return parts.length ? `按 ${parts.join("、")} 筛选机型库` : "筛选机型库";
    }
    case "get_laptop_detail":
      return `查 ${(a as { name?: string; id?: string }).name ?? (a as { id?: string }).id ?? "机型"} 的完整参数`;
    case "compare_laptops": {
      const ids = (a as { ids?: string[] }).ids ?? [];
      return `对比 ${ids.length} 台机器`;
    }
    case "search_reviews":
      return `检索评测资料：${(a as { query?: string }).query ?? ""}`;
    case "diagnose_shortage":
      return "诊断是哪条条件把结果卡死了";
    case "update_constraints": {
      const patch = a as ConstraintPatch;
      const set = describeConstraints((patch.set ?? {}) as Constraints);
      const clr = (patch.clear ?? []).map((k) => CONSTRAINT_LABELS[k]);
      const parts = [
        set.length ? `调整 ${set.join("、")}` : "",
        clr.length ? `去掉 ${clr.join("、")}` : "",
      ].filter(Boolean);
      return parts.length ? parts.join("；") : "更新筛选条件";
    }
    default:
      return `调用 ${name}`;
  }
}

export function describeConstraints(c: Constraints): string[] {
  const out: string[] = [];
  for (const key of Object.keys(CONSTRAINT_LABELS) as (keyof Constraints)[]) {
    const v = c[key];
    if (v === undefined || v === null) continue;
    if (key === "usages") continue;
    if (key === "brands") continue;
    if (key === "models") continue;
    if (typeof v === "boolean") {
      out.push(CONSTRAINT_LABELS[key]);
    } else {
      out.push(`${CONSTRAINT_LABELS[key]} ${v}${CONSTRAINT_UNITS[key] ?? ""}`);
    }
  }
  if (c.usages?.length) out.push(`场景 ${c.usages.join("/")}`);
  if (c.brands?.length) out.push(`品牌 ${c.brands.join("/")}`);
  if (c.models?.length) out.push(`机型 ${c.models.join("/")}`);
  return out;
}

export function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

// ---------- 单台机器的完整文本 ----------

function detailText(l: Laptop): string {
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
    `【${l.brand} ${l.model}】id=${l.id}`,
    `价格：${l.price} 元${l.subsidyPrice !== undefined ? `（国补价 ${l.subsidyPrice} 元）` : ""}`,
    `屏幕：${screen}`,
    `CPU：${cpu}`,
    `显卡：${l.gpu}`,
    `内存：${formatRam(l)}${l.storage !== undefined ? `　硬盘：${l.storage}GB` : ""}`,
    `重量：${l.weight}kg${l.battery !== undefined ? `　电池：${l.battery}Wh` : ""}`,
    l.ports?.length ? `接口：${l.ports.join("、")}` : "",
    `优点：${l.highlights.join("；")}`,
    `短板：${l.drawbacks.join("；")}`,
  ].join("\n");
}

function findLaptop(id?: string, name?: string): Laptop | undefined {
  if (id) return laptops.find((l) => l.id === id);
  if (name) {
    const n = name.trim();
    return (
      laptops.find((l) => `${l.brand} ${l.model}`.includes(n)) ??
      laptops.find((l) => l.model.includes(n) || n.includes(l.model))
    );
  }
  return undefined;
}

// ---------- 工具执行器 ----------

/**
 * 执行一次工具调用。
 * 任何异常都在这里被兜住，返回给模型的永远是一段可读文本，
 * 而不是让整个 Agent 循环崩掉。
 */
export async function executeTool(name: string, rawArgs: string): Promise<ToolResult> {
  const args = safeJson(rawArgs);

  switch (name) {
    case "filter_laptops":
      return runFilter(args);
    case "get_laptop_detail":
      return runDetail(args);
    case "compare_laptops":
      return runCompare(args);
    case "search_reviews":
      return runReview(args);
    case "diagnose_shortage":
      return runDiagnose(args);
    case "update_constraints":
      return runUpdateConstraints(args);
    default:
      return {
        content: `没有名为「${name}」的工具。可用工具：filter_laptops / get_laptop_detail / compare_laptops / search_reviews / diagnose_shortage。`,
        summary: `调用了不存在的工具 ${name}`,
      };
  }
}

function runFilter(args: unknown): ToolResult {
  const parsed = FilterArgs.safeParse(args);
  if (!parsed.success) {
    return {
      content: `参数不合法，已拒绝执行：${parsed.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("；")}`,
      summary: "筛选参数越界，已拦截",
    };
  }
  const c = parsed.data as Constraints;
  const hits = laptops.filter((l) => satisfies(l, c));

  if (hits.length === 0) {
    return {
      content:
        "参数库里没有任何一台机型满足这些条件（0 台）。请调用 diagnose_shortage 找出是哪条卡死了，或放宽条件后再查。绝对不要编造机型。",
      summary: "筛出 0 台，需要诊断",
    };
  }

  // 高能效软偏好优先（能效档位高的排前面），再按强核显软偏好，最后按价格升序
  const sorted = [...hits]
    .sort((a, b) => {
      if (c.preferEfficient) {
        const ta = efficiencyTier(a.cpu.name);
        const tb = efficiencyTier(b.cpu.name);
        if (ta !== tb) return tb - ta;
      }
      if (c.preferStrongIGpu) {
        const ia = hasStrongIGpu(a.cpu.name) ? 1 : 0;
        const ib = hasStrongIGpu(b.cpu.name) ? 1 : 0;
        if (ia !== ib) return ib - ia;
      }
      return a.price - b.price;
    })
    .slice(0, 6);
  return {
    content:
      `共筛出 ${hits.length} 台，按价格升序（最多列 6 台）：\n\n` +
      sorted.map(detailText).join("\n\n"),
    summary: `筛出 ${hits.length} 台`,
  };
}

function runDetail(args: unknown): ToolResult {
  const parsed = DetailArgs.safeParse(args);
  if (!parsed.success) {
    return { content: "参数不合法：id 和 name 至少给一个。", summary: "查询参数缺失" };
  }
  const l = findLaptop(parsed.data.id, parsed.data.name);
  if (!l) {
    // 参数库里没有，但它可能只是「推荐名录」里的一台（只有价位段和优缺点，没实测参数）。
    // 这种情况不能说"查无此机"，否则模型会以为整个系统里都没这台机器。
    const g = findGuide(parsed.data.id, parsed.data.name);
    if (g) {
      return {
        content:
          `【${g.fullName}】在「推荐名录」里，但没有进入「实测参数库」。\n` +
          `价位段：${formatPriceBand(g)}　定位：${GUIDE_CATEGORY_LABELS[g.category]}\n` +
          `优点：${g.pros.join("；") || "无"}\n` +
          `短板：${g.cons.join("；") || "无"}\n` +
          (g.notes.length ? `补充：${g.notes.join("；")}\n` : "") +
          `\n注意：这台机器没有确切的屏幕/重量/电池实测数据，不能给它做数值筛选，` +
          `也不许编造这些数字。如果用户需要精确参数，如实说明查不到。`,
        summary: `名录里有 ${g.fullName}（无实测参数）`,
      };
    }
    return {
      content:
        `实测参数库里没有这台机器（共 ${laptops.length} 台），推荐名录里也查不到。` +
        `请如实告诉用户「我的库里没有这台」，不要编造它的参数，也不要推荐它。`,
      summary: "查无此机",
    };
  }
  return { content: detailText(l), summary: `查到 ${l.brand} ${l.model}` };
}

function findGuide(id?: string, name?: string) {
  if (id) {
    const byId = guideCatalog.find((g) => g.id === id);
    if (byId) return byId;
  }
  if (!name) return undefined;
  const n = name.trim();
  if (n.length < 2) return undefined;

  // 机型名写法差异很大：「无界14 Max Carbon」vs「无界 14 MAX/MAX Carbon」。
  // 所以先做归一化（去空格、转小写）再比，否则明明库里有却报查无此机。
  const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  const key = norm(n);

  return (
    guideCatalog.find((g) => norm(g.fullName).includes(key)) ??
    guideCatalog.find((g) => key.includes(norm(g.model))) ??
    // 最后一招：把用户给的词按空格拆开，要求全部都出现在 fullName 里
    guideCatalog.find((g) => {
      const target = norm(g.fullName);
      return n
        .split(/\s+/)
        .filter((w) => w.length >= 2)
        .every((w) => target.includes(norm(w)));
    })
  );
}

function runCompare(args: unknown): ToolResult {
  const parsed = CompareArgs.safeParse(args);
  if (!parsed.success) {
    return {
      content: "参数不合法：ids 需要 2 到 3 个机型 id。",
      summary: "对比参数不合法",
    };
  }
  const found = parsed.data.ids
    .map((id) => laptops.find((l) => l.id === id))
    .filter((l): l is Laptop => Boolean(l));

  if (found.length < 2) {
    return {
      content: `只找到 ${found.length} 台。请用 filter_laptops 返回的 id，不要自己造 id。`,
      summary: "对比的机型不全",
    };
  }

  const rows: [string, (l: Laptop) => string][] = [
    ["价格", (l) => `${l.price} 元${l.subsidyPrice !== undefined ? `（国补 ${l.subsidyPrice}）` : ""}`],
    ["屏幕", (l) => `${l.screen.sizeInch}" ${l.screen.resolution} / ${l.screen.ppi}ppi`],
    ["刷新率", (l) => (l.screen.refreshRate !== undefined ? `${l.screen.refreshRate}Hz` : "未标注")],
    ["亮度", (l) => (l.screen.brightness !== undefined ? `${l.screen.brightness} nit` : "未标注")],
    ["色域", (l) => l.screen.colorGamut ?? "未标注"],
    ["CPU", (l) => formatCpu(l.cpu.name)],
    ["显卡", (l) => l.gpu],
    ["内存", (l) => formatRam(l)],
    ["硬盘", (l) => (l.storage !== undefined ? `${l.storage}GB` : "未标注")],
    ["重量", (l) => `${l.weight}kg`],
    ["电池", (l) => (l.battery !== undefined ? `${l.battery}Wh` : "未标注")],
  ];

  const table = rows
    .map(([label, fn]) => `${label}：${found.map((l) => fn(l)).join(" ｜ ")}`)
    .join("\n");

  return {
    content:
      `对比 ${found.map((l) => `${l.brand} ${l.model}`).join(" vs ")}\n\n${table}\n\n` +
      `各自的短板：\n${found.map((l) => `- ${l.model}：${l.drawbacks.join("；")}`).join("\n")}`,
    summary: `对比了 ${found.length} 台`,
  };
}

async function runReview(args: unknown): Promise<ToolResult> {
  const parsed = ReviewArgs.safeParse(args);
  if (!parsed.success) {
    return { content: "参数不合法：query 必填，1-120 字。", summary: "检索参数不合法" };
  }
  const hits = await smartSearch(parsed.data.query, parsed.data.limit ?? 5);
  return {
    content: formatHitsForModel(hits),
    citations: toCitations(hits),
    summary: hits.length ? `检索到 ${hits.length} 条资料` : "没有检索到相关资料",
  };
}

const RELAX_ORDER: (keyof Constraints)[] = [
  "storageMin",
  "batteryMin",
  "refreshMin",
  "ramMin",
  "screenSizeMin",
  "ppiMin",
  "weightMax",
  "preferEfficient",
  "preferStrongIGpu",
  "requireDiscreteGpu",
  "usages",
  "budgetMax",
];

function runDiagnose(args: unknown): ToolResult {
  const parsed = DiagnoseArgs.safeParse(args);
  if (!parsed.success) {
    return { content: "参数不合法，无法诊断。", summary: "诊断参数不合法" };
  }
  const c = parsed.data as Constraints;

  const active = RELAX_ORDER.filter((k) => c[k] !== undefined && c[k] !== null);
  if (active.length === 0) {
    return {
      content: "没有任何约束条件，参数库全部机型都可用，不存在筛不出的问题。",
      summary: "无约束，无需诊断",
    };
  }

  const label = (k: keyof Constraints) => {
    const v = c[k];
    return typeof v === "boolean"
      ? CONSTRAINT_LABELS[k]
      : `${CONSTRAINT_LABELS[k]} ${v}${CONSTRAINT_UNITS[k] ?? ""}`;
  };

  // 最优先识别「预算本身就低于库里最便宜的机器」。
  // 这种情况下列什么"放宽重量能多几台"都是误导——真正该说的是预算不够。
  const minPrice = Math.min(...laptops.map((l) => l.price));
  if (c.budgetMax !== undefined && c.budgetMax < minPrice) {
    return {
      content:
        `最关键的问题：预算上限 ${c.budgetMax} 元，低于参数库里最便宜的机型（${minPrice} 元）。` +
        `所以无论怎么放宽其它条件都筛不出来。\n` +
        `请如实告诉用户：参数库（${laptops.length} 台实测机型）里没有 ${c.budgetMax} 元以内的机器，` +
        `最低 ${minPrice} 元起。可以建议用户提高预算，或用 search_reviews 查同价位段的参考机型。` +
        `绝对不要为了凑数推荐超预算机型或编造机型。`,
      summary: `预算低于库内最低价 ${minPrice} 元`,
    };
  }

  const countWithout = (keys: (keyof Constraints)[]) => {
    const relaxed: Constraints = { ...c };
    for (const k of keys) delete relaxed[k];
    return laptops.filter((l) => satisfies(l, relaxed)).length;
  };

  // 第一轮：单条移除
  const singles: { key: keyof Constraints; n: number }[] = [];
  for (const k of active) {
    const n = countWithout([k]);
    if (n > 0) singles.push({ key: k, n });
  }

  if (singles.length > 0) {
    singles.sort((a, b) => b.n - a.n);
    const lines = singles.map((s) => `- 去掉「${label(s.key)}」→ 有 ${s.n} 台符合`).join("\n");
    const best = singles[0];
    return {
      content:
        `逐条移除约束后，能筛出机型的调整如下（参数库共 ${laptops.length} 台）：\n${lines}\n\n` +
        `建议优先放宽「${label(best.key)}」——去掉它得到的机型最多（${best.n} 台），对本质需求影响最小。` +
        `注意：如果是预算（budgetMax）被放宽，必须明确告诉用户「这些机器超出你的预算」，让用户自己决定，不要替他改预算。`,
      summary: `建议放宽「${label(best.key)}」`,
    };
  }

  // 第二轮：单条都不行，说明是组合卡死，试两两组合
  const pairs: { keys: [keyof Constraints, keyof Constraints]; n: number }[] = [];
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const n = countWithout([active[i], active[j]]);
      if (n > 0) pairs.push({ keys: [active[i], active[j]], n });
    }
  }

  if (pairs.length > 0) {
    pairs.sort((a, b) => b.n - a.n);
    const lines = pairs
      .slice(0, 5)
      .map((p) => `- 同时去掉「${label(p.keys[0])}」+「${label(p.keys[1])}」→ 有 ${p.n} 台符合`)
      .join("\n");
    const best = pairs[0];
    return {
      content:
        `单独去掉任何一条都筛不出机型，说明是**多条条件叠加**把结果卡死了。两两放松后可行：\n${lines}\n\n` +
        `最省事的调整是同时放宽「${label(best.keys[0])}」和「${label(best.keys[1])}」（${best.n} 台）。` +
        `必须如实告诉用户是哪几条条件互相打架，由用户决定放哪一条——不要替用户改预算。`,
      summary: `需同时放宽「${label(best.keys[0])}」和「${label(best.keys[1])}」`,
    };
  }

  // 第三轮：全放开也不行，说明是别的死结
  const noBudget = countWithout(["budgetMax"]);
  return {
    content:
      `逐条、两两移除约束都无法筛出机型（移除预算后剩 ${noBudget} 台），说明这些条件组合的交集本身不存在。` +
      `请如实告诉用户参数库覆盖有限，并指出哪几条是互相冲突的硬条件。绝对不要编造机型。`,
    summary: "多条件互相冲突，无可行调整",
  };
}

// ---------- 约束同步工具 ----------

/**
 * 把模型整理的「条件变更」交出去。
 *
 * 这个工具不查参数库、不产生机型数据，它只做一件事：把用户追问里的
 * 条件变更（预算改了/加了独显/去掉重量限制…）规规矩矩地打包成
 * ConstraintPatch，交给前端那个「是否同步至匹配结果」按钮。
 *
 * 关键设计：这里只「打包」，不「应用」。真正改 constraints、触发重新筛选
 * 的，是用户点了按钮之后在 page.tsx 里做的。为什么不让模型直接改？
 * 因为匹配结果区是「规则引擎」的地盘，AI 只能提议、不能越权覆盖
 * 用户已经定好的条件——这守住了「AI 安全可控」里"AI 不直接改用户数据"的底线。
 */
function runUpdateConstraints(args: unknown): ToolResult {
  const parsed = ConstraintPatchArgs.safeParse(args);
  if (!parsed.success) {
    return {
      content: `参数不合法，已拒绝执行：${parsed.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("；")}`,
      summary: "条件同步参数不合法",
    };
  }

  const { set, clear } = parsed.data;
  const hasSet = set && Object.keys(set).length > 0;
  const hasClear = clear && clear.length > 0;

  if (!hasSet && !hasClear) {
    return {
      content: "你没有提供任何条件变更（set 和 clear 都是空的）。如果用户没有明确要求改条件，就不要调用本工具。",
      summary: "无有效条件变更",
    };
  }

  const patch: ConstraintPatch = {
    ...(hasSet ? { set: set as Constraints } : {}),
    ...(hasClear ? { clear } : {}),
  };

  const setDesc = hasSet ? describeConstraints(set as Constraints).join("、") : "";
  const clearDesc = hasClear ? (clear as (keyof Constraints)[]).map((k) => CONSTRAINT_LABELS[k]).join("、") : "";

  return {
    content:
      `已整理出条件变更：\n` +
      `${setDesc ? `- 新增/修改：${setDesc}\n` : ""}` +
      `${clearDesc ? `- 删除：${clearDesc}\n` : ""}` +
      `\n请在回答里用一句话说明「我把你的条件理解成了这样，需要你确认后同步到匹配结果」，` +
      `然后停在这里，等用户确认。不要继续调用其他工具，也不要在用户确认前擅自改条件。`,
    summary: [setDesc && `调整 ${setDesc}`, clearDesc && `去掉 ${clearDesc}`].filter(Boolean).join("；") || "更新筛选条件",
    constraintPatch: patch,
  };
}
