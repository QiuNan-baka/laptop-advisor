/**
 * 键盘需求词典 —— 把「配列 / 轴体 / 连接 / 用途」这类模糊说法翻译成可筛选约束。
 *
 * 键盘需求基本是枚举型（配列 / 轴体类型 / 连接方式 / 用途），
 * 本地词典一对一映射最准最快、零 token、零 Key 依赖，符合「能写 if-else 就别用 AI」。
 * 铁律不变：清单里没有的参数不编造。
 */

import type { Connection, KeyboardUsage, Layout, SwitchType } from "./keyboard-specs";

export interface KeyboardConstraints {
  budgetMin?: number;
  budgetMax?: number;
  /** 配列（OR 语义：命中任一档即入选） */
  layouts?: Layout[];
  /** 轴体类型（OR 语义） */
  switchTypes?: SwitchType[];
  /** 连接方式（AND 语义：键盘须包含所有指定方式，三模=三种都有） */
  connections?: Connection[];
  /** 是否提供网页驱动 */
  webDriver?: boolean;
  /** 用途（OR 语义） */
  usages?: KeyboardUsage[];
}

export const KEYBOARD_CONSTRAINT_LABELS: Record<keyof KeyboardConstraints, string> = {
  budgetMin: "最低预算",
  budgetMax: "预算上限",
  layouts: "配列",
  switchTypes: "轴体类型",
  connections: "连接方式",
  webDriver: "网页驱动",
  usages: "用途",
};

export interface KeyboardDictionaryEntry {
  id: string;
  keywords: string[];
  label: string;
  explain: string;
  patch: KeyboardConstraints;
}

export const keyboardDictionary: KeyboardDictionaryEntry[] = [
  // ===== 配列 =====
  {
    id: "layout-60",
    keywords: ["60%", "60配列", "61键", "小键盘", "迷你键盘", "极致小尺寸"],
    label: "60% 配列",
    explain: "60%（61 键）去掉了方向区和 F 区，桌面最省空间。我按「60% 配列」来筛。",
    patch: { layouts: ["60"] },
  },
  {
    id: "layout-65",
    keywords: ["65%", "65配列", "68键"],
    label: "65% 配列",
    explain: "65%（68 键）保留方向键和少量功能键，兼顾小巧与实用。我按「65% 配列」来筛。",
    patch: { layouts: ["65"] },
  },
  {
    id: "layout-75",
    keywords: ["75%", "75配列", "81键", "84键", "带旋钮"],
    label: "75% 配列",
    explain: "75%（81/84 键）保留 F 区和方向键，通常带旋钮，是目前最热门的配列。我按「75% 配列」来筛。",
    patch: { layouts: ["75"] },
  },
  {
    id: "layout-80",
    keywords: ["80%", "80配列", "87键", "88键", "tkl", "无数字区", "去掉数字区"],
    label: "80% TKL",
    explain: "80% TKL（87/88 键）砍掉数字区、保留全部功能键，游戏和办公都合适。我按「80% 配列」来筛。",
    patch: { layouts: ["80"] },
  },
  {
    id: "layout-98",
    keywords: ["98%", "98配列", "98键", "带数字区", "数字区", "小数字键盘"],
    label: "98% 配列",
    explain: "98%（98 键）保留数字区又比全尺寸短，财务和表格用户友好。我按「98% 配列」来筛。",
    patch: { layouts: ["98"] },
  },
  {
    id: "layout-100",
    keywords: ["100%", "100配列", "104键", "108键", "全尺寸", "全键", "标准键盘"],
    label: "100% 全尺寸",
    explain: "100%（104/108 键）完整布局，重数字输入场景首选。我按「100% 配列」来筛。",
    patch: { layouts: ["100"] },
  },

  // ===== 轴体类型 =====
  {
    id: "switch-linear",
    keywords: ["线性轴", "红轴", "线性", "直上直下", "静音线性"],
    label: "线性轴",
    explain: "线性轴直上直下无段落感，游戏和码字都通用。我按「线性轴」来筛。",
    patch: { switchTypes: ["linear"] },
  },
  {
    id: "switch-tactile",
    keywords: ["段落轴", "茶轴", "段落", "有段落感"],
    label: "段落轴",
    explain: "段落轴有轻微卡顿反馈，兼顾打字手感与安静。我按「段落轴」来筛。",
    patch: { switchTypes: ["tactile"] },
  },
  {
    id: "switch-clicky",
    keywords: ["青轴", "clicky", "咔哒", "有声轴", "清脆"],
    label: "青轴/clicky",
    explain: "clicky 轴有清脆的咔哒声和明显段落感，打字爽但较吵。我按「青轴/clicky」来筛。",
    patch: { switchTypes: ["clicky"] },
  },
  {
    id: "switch-magnetic",
    keywords: ["磁轴", "霍尔", "快速触发", "rt", "磁轴键盘"],
    label: "磁轴",
    explain: "磁轴支持 RT（快速触发）和可调键程，是 FPS/音游玩家的首选。我按「磁轴」来筛。",
    patch: { switchTypes: ["magnetic"] },
  },
  {
    id: "switch-optical",
    keywords: ["光轴", "光轴键盘", "光学轴"],
    label: "光轴",
    explain: "光轴响应快、防水防尘，大厂电竞键盘常用。我按「光轴」来筛。",
    patch: { switchTypes: ["optical"] },
  },
  {
    id: "switch-low-profile",
    keywords: ["矮轴", "矮轴键盘", "薄键盘", "超薄", "轻薄键盘"],
    label: "矮轴",
    explain: "矮轴行程短、机身薄，适合经常带出门或桌面极简。我按「矮轴」来筛。",
    patch: { switchTypes: ["low-profile"] },
  },

  // ===== 连接方式 =====
  {
    id: "kb-tri-mode",
    keywords: ["三模", "三模式", "三种连接", "有线无线蓝牙都"],
    label: "三模",
    explain: "三模 = 有线 + 2.4G + 蓝牙，兼容性最强。我按「三模」来筛。",
    patch: { connections: ["wired", "wireless24g", "bluetooth"] },
  },
  {
    id: "kb-bluetooth",
    keywords: ["蓝牙", "bluetooth", "多设备切换", "连多个设备", "多设备"],
    label: "蓝牙",
    explain: "蓝牙可连平板/笔记本/手机，支持多设备切换。我按「蓝牙」来筛。",
    patch: { connections: ["bluetooth"] },
  },
  {
    id: "kb-wireless",
    keywords: ["无线", "2.4g", "2.4g接收器", "接收器"],
    label: "2.4G 无线",
    explain: "2.4G 接收器延迟低、抗干扰，适合游戏；但需占用一个 USB 口。我按「2.4G」来筛。",
    patch: { connections: ["wireless24g"] },
  },
  {
    id: "kb-wired",
    keywords: ["有线", "线控", "有线键盘"],
    label: "有线",
    explain: "有线键盘零延迟、免充电、便宜，适合桌面固定和电竞。我按「有线」来筛。",
    patch: { connections: ["wired"] },
  },

  // ===== 用途 =====
  {
    id: "kb-gaming",
    keywords: ["游戏", "打游戏", "电竞", "fps", "竞技", "cs", "lol", "吃鸡", "瓦罗兰特"],
    label: "游戏",
    explain: "游戏键盘看响应速度（磁轴/光轴）和低延迟。我按「游戏用途」来筛。",
    patch: { usages: ["gaming"] },
  },
  {
    id: "kb-office",
    keywords: ["办公", "写文档", "做ppt", "日常", "上班", "工作", "码字", "打字"],
    label: "办公",
    explain: "办公键盘看手感、安静和稳定。我按「办公用途」来筛。",
    patch: { usages: ["office"] },
  },
  {
    id: "kb-general",
    keywords: ["通用", "日用", "什么都干", "不挑", "随便"],
    label: "通用",
    explain: "通用键盘兼顾游戏与办公。我按「通用用途」来筛。",
    patch: { usages: ["general"] },
  },

  // ===== 其他（从清单补充） =====
  {
    id: "kb-rgb",
    keywords: ["rgb", "灯效", "灯", "发光", "背光"],
    label: "RGB 灯效",
    explain: "清单里 RGB 灯效不是独立筛选字段，已记录你的偏好（多数游戏键盘都带灯）。",
    patch: {},
  },
  {
    id: "kb-webdriver",
    keywords: ["网页驱动", "网页调参", "网页版驱动", "不用装驱动", "浏览器驱动"],
    label: "网页驱动",
    explain: "网页驱动 = 打开浏览器就能调键位/灯效/宏，无需装桌面客户端。我按「网页驱动」来筛。",
    patch: { webDriver: true },
  },
];

/** 从自由文本里抽取预算的显式数字 */
export function extractKeyboardNumbers(text: string): KeyboardConstraints {
  const patch: KeyboardConstraints = {};

  const maxMatch = text.match(/(\d{2,4})\s*(?:元)?\s*(?:以内|以下|左右|之内|内)/);
  if (maxMatch) patch.budgetMax = Number(maxMatch[1]);
  const altMax = text.match(/(?:预算|最多|不超过|大概|大约|想花)\s*(\d{2,4})/);
  if (altMax) patch.budgetMax = Number(altMax[1]);
  const range = text.match(/(\d{2,4})\s*[-~到]\s*(\d{2,4})/);
  if (range) {
    patch.budgetMin = Number(range[1]);
    patch.budgetMax = Number(range[2]);
  }

  return patch;
}
