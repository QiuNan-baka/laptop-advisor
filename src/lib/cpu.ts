/**
 * CPU 名称格式化。
 *
 * 【为什么需要这一层】
 * 机型库里的 CPU 名字是从选购指南原文扒下来的，写法很乱：
 *   "Core 5 205H"、"i5-14450HX"、"Ultra 7 251HX"  → 看不出是 Intel 的
 *   "R7 8845HS"、"AI 9 H 365"、"锐龙9 9955HX"       → 看不出是 AMD 的
 *   "M4（10核CPU+10核GPU）"                          → 看不出是 Apple 的
 *
 * 显示前统一补上厂商名，并按用户的偏好用英文厂商名 + 原生产品名：
 *   Intel  → "Intel Core …"（Core / Core Ultra / Core i5- 归一到 Core 开头）
 *   AMD    → "AMD Ryzen …"（R7 / AI / 锐龙 归一到 Ryzen 开头）
 *   Apple  → "Apple …" / 高通 → "高通 骁龙 …" / 华为 → "华为 麒麟 …"
 *
 * 【注意】这里只改「显示」，不改机型库里的原始数据。
 * 原始数据保持原样，方便以后和指南原文对照。
 */

interface VendorRule {
  test: RegExp;
  vendor: string;
}

const VENDOR_RULES: VendorRule[] = [
  { test: /英特尔|intel|^core\b|^ultra\b|^i[3579]-/i, vendor: "Intel" },
  { test: /amd|锐龙|ryzen|^r[5-9][\s-]?\d|^ai\s+/i, vendor: "AMD" },
  { test: /苹果|apple|^m[1-9]\b|^a1[0-9]/i, vendor: "Apple" },
  { test: /高通|骁龙|snapdragon|^x2e/i, vendor: "高通" },
  { test: /华为|麒麟/i, vendor: "华为" },
];

function detectVendor(name: string): string {
  for (const rule of VENDOR_RULES) {
    if (rule.test.test(name)) return rule.vendor;
  }
  return "";
}

/** 把产品名部分归一到原生英文写法：Core/Ultra/i5-→Core、R7/AI/锐龙→Ryzen */
function normalizeProductName(raw: string): string {
  let n = raw
    .replace(/^第三代\s*/, "")
    .replace(/^(intel|英特尔)\s*/i, "")
    .replace(/^amd\s*/i, "")
    .replace(/^(apple|苹果)\s*/i, "")
    .replace(/^高通\s*/, "")
    .trim();

  // 中文产品词 → 英文
  n = n.replace(/酷睿\s*/g, "Core ");
  n = n.replace(/锐龙\s*/g, "Ryzen ");

  // Intel：Ultra 前补 Core、i 系列前补 Core
  n = n
    .replace(/^ultra\b/i, "Core Ultra")
    .replace(/^i([3579])-/i, "Core i$1-");

  // AMD：R5~R9 前补 Ryzen、AI 前补 Ryzen
  n = n
    .replace(/^R([5-9])\b\s*/i, "Ryzen $1 ")
    .replace(/^ai\s+/i, "Ryzen AI ");

  // 骁龙部件号尾巴（X2E-94-100）对人没意义，砍掉
  n = n.replace(/\s+X\dE?-\d.*$/i, "");

  return n.replace(/\s+/g, " ").trim();
}

/** 例：Core 5 205H → Intel Core 5 205H；R7 8845HS → AMD Ryzen 7 8845HS */
export function formatCpu(raw: string): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  const vendor = detectVendor(s);
  const name = normalizeProductName(s);
  return vendor ? `${vendor} ${name}` : name;
}

/**
 * CPU 能效分级（按续航/功耗比，非性能）。
 *
 * 【为什么需要分级】
 * 用户说"一天不用充电"时，正确的领域映射是「高能效芯片」，而不是「大电池」。
 * 但能效不是非黑即白，用户在 m04179/m04243 逐款纠正过。最终续航能效排序（用户原话）：
 *
 *   ultra3xx ≈ core3xx ≈ ultra2xxV  >  ultra2xx ≈ Ryzen AI / 锐龙H255 / 8845HS
 *
 * 落到四档：
 *   tier 2 = 顶级能效（续航王者）
 *     - Apple M / A 系列（ARM）
 *     - 高通 骁龙 X 系列（ARM）
 *     - 华为 麒麟 XE90（ARM）
 *     - Intel Ultra 3xx（336H/338H/356H/386H/358H/388H）
 *     - Intel wildcat lake core 3xx（Core 5 315/320、Core 7 350，低性能长续航）
 *     - Intel Ultra 2xxV（226V/258V/266V，V 后缀是长续航特调）
 *   tier 1 = 高能效（略逊于顶级，但仍明显省电）
 *     - Intel Ultra 2xx 非 V（225H/255H/285H）
 *     - AMD Ryzen AI 系列（AI 9 H 365 / 465）—— 能效强，但 GPU 弱
 *     - AMD 8845HS（Zen4 HS 标压，能效好）
 *     - AMD H 255（锐龙 7 H 255 新 H 系列）
 *   tier 0.5 = 高能效但偏 GPU（Ryzen AI MAX）
 *     - AMD Ryzen AI MAX+ 392 —— 能效稍逊于 Ryzen AI 系列，但 GPU 强
 *   tier 0 = 非高能效
 *     - HX 发烧级、老架构 i5/i7/i9、老 R5-R9、Core 5 205H（用户明确非 wildcat）
 *
 * 返回值用于排序加权：preferEfficient 时 tier 高的排前面。
 * isEfficientCpu() 把 tier > 0 都算「高能效」，用于命中计数等布尔场景。
 */
export function efficiencyTier(name: string): number {
  const n = (name ?? "").trim();
  if (!n) return 0;

  // —— tier 2：顶级能效 ——
  // Apple：M 系列（M4 / M5 / M5 Max…）或 A 系列（A18 Pro）
  if (/apple|苹果|^m[1-9]\b|^a1[0-9]/i.test(n)) return 2;
  // 高通骁龙 X（X1E / X2E）
  if (/骁龙|snapdragon|^x[12]e/i.test(n)) return 2;
  // 华为麒麟 XE90
  if (/麒麟|xe90/i.test(n)) return 2;

  // Intel Core Ultra（不含 HX 发烧后缀）
  if (/ultra/i.test(n) && !/hx/i.test(n)) {
    // V 后缀（226V/258V/266V）是长续航特调 → 顶级
    if (/\b\d+V\b/.test(n)) return 2;
    // 提取三位数字：3xx（≥300）→ 顶级；2xx（<300）→ 次顶级
    const m = n.match(/(\d{3})/);
    if (m) return parseInt(m[1], 10) >= 300 ? 2 : 1;
    return 2; // 兜底：识别不到数字的 Ultra 默认顶级
  }

  // Intel wildcat lake core 3xx：Core 5 315/320、Core 7 350（低性能长续航）
  // 注意 Core 5 205H（2xx）不匹配，会落到 tier 0
  if (/(?:core|酷睿)\s*[57]\s*3[1-5]\d\b/i.test(n)) return 2;

  // —— tier 0.5：Ryzen AI MAX（必须先于 Ryzen AI 判断，因为 MAX 名字也含 "AI"） ——
  if (/max/i.test(n) && !/hx/i.test(n)) return 0.5;

  // —— tier 1：高能效（次顶级） ——
  // AMD Ryzen AI 系列（AI 9 H 365 / 465，不含 MAX）
  if (/(?:ryzen|锐龙)\s*ai|^ai\s*\d/i.test(n) && !/hx/i.test(n)) return 1;
  // AMD 8845HS（Zen4 HS 标压，能效好，非 HX）
  if (/8845hs/i.test(n) || /^R[5-9]\s*\d+HS\b/i.test(n)) return 1;
  // AMD H 255（锐龙 7 H 255 新 H 系列，"H 空格 数字"，注意别误伤 Intel 的 "255H"）
  if (/\bH\s*25\d\b/i.test(n)) return 1;

  return 0;
}

/** 是否属于「高能效」平台（tier > 0）。用于命中计数等布尔场景。 */
export function isEfficientCpu(name: string): boolean {
  return efficiencyTier(name) > 0;
}

/**
 * 是否带 Arc 强核显（核显性能足以轻度玩 3A）。
 *
 * 【依据】用户 m04334 补充：「轻薄本中适合轻度玩3a的只有搭载 X7-358H 和 X9-388H 的机型」。
 * 核显轻薄本里，只有 Intel Core Ultra X7-358H / X9-388H 的 Arc 核显带得动 3A，
 * 其余核显（Apple M / 骁龙 X / 普通 Ultra）玩不动或体验差。
 * 用于「轻度游戏」场景的排序加权（软偏好，不硬过滤独显游戏本）。
 */
export function hasStrongIGpu(name: string): boolean {
  return /x\s*7\s*358\s*h|x\s*9\s*388\s*h/i.test((name ?? "").trim());
}
