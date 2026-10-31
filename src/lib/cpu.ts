/**
 * CPU 名称格式化。
 *
 * 【为什么需要这一层】
 * 机型库里的 CPU 名字是从选购指南原文扒下来的，写法很乱：
 *   "Core 5 205H"、"i5-14450HX"、"Ultra 7 251HX"  → 看不出是英特尔的
 *   "R7 8845HS"、"AI 9 H 365"、"锐龙9 9955HX"       → 看不出是 AMD 的
 *   "M4（10核CPU+10核GPU）"                         → 看不出是苹果的
 *
 * 用户看不懂这个就不知道自己在比什么。所以显示前统一补上厂商名，
 * 顺手把写法归一（Ryzen→锐龙、Core→酷睿、R7→锐龙 7）。
 *
 * 【注意】这里只改「显示」，不改机型库里的原始数据。
 * 原始数据保持原样，方便以后和指南原文对照。
 */

interface VendorRule {
  test: RegExp;
  vendor: string;
}

const VENDOR_RULES: VendorRule[] = [
  { test: /英特尔|intel|^core\b|^ultra\b|^i[3579]-/i, vendor: "英特尔" },
  { test: /amd|锐龙|ryzen|^r[5-9][\s-]?\d|^ai\s+/i, vendor: "AMD" },
  { test: /苹果|apple|^m[1-9]\b|^a1[0-9]/i, vendor: "苹果" },
  { test: /高通|骁龙|snapdragon|^x2e/i, vendor: "高通" },
  { test: /华为|麒麟/i, vendor: "华为" },
];

function detectVendor(name: string): string {
  for (const rule of VENDOR_RULES) {
    if (rule.test.test(name)) return rule.vendor;
  }
  return "";
}

/** 把产品名部分归一：Core→酷睿、Ultra→酷睿 Ultra、i5-→酷睿 i5-、Ryzen→锐龙 */
function normalizeProductName(raw: string): string {
  let n = raw
    .replace(/^第三代\s*/, "")
    .replace(/^(intel|英特尔)\s*/i, "")
    .replace(/^amd\s*/i, "")
    .replace(/^(apple|苹果)\s*/i, "")
    .replace(/^高通\s*/, "")
    .trim();

  n = n
    .replace(/^core\b\s*/i, "酷睿 ")
    .replace(/^ultra\b\s*/i, "酷睿 Ultra ")
    .replace(/^i([3579])-/, "酷睿 i$1-")
    .replace(/^ryzen\s+ai\s+/i, "锐龙 AI ")
    .replace(/^ryzen\s+/i, "")
    .replace(/^ai\s+max/i, "锐龙 AI MAX")
    .replace(/^ai\s+(\d)/i, "锐龙 AI $1")
    .replace(/^锐龙\s*(\d)/, "锐龙 $1")
    .replace(/^R([5-9])\b\s*/i, "锐龙 $1 ")
    .replace(/^麒麟\s*/, "麒麟 ")
    // 骁龙的部件号尾巴（X2E-94-100）对人没意义，砍掉
    .replace(/\s+X\dE?-\d.*$/i, "");

  return n.replace(/\s+/g, " ").trim();
}

/** 例：Core 5 205H → 英特尔 酷睿 5 205H；R7 8845HS → AMD 锐龙 7 8845HS */
export function formatCpu(raw: string): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  const vendor = detectVendor(s);
  const name = normalizeProductName(s);
  return vendor ? `${vendor} ${name}` : name;
}
