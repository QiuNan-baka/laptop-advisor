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
