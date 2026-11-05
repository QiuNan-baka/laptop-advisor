/**
 * 推荐类目配置。
 *
 * 「笔记本推荐」是当前二级界面（主应用）；键盘/鼠标/显示器与它同为二级界面，
 * 基础样式以笔记本推荐为模板复制，但把输入框的问句换成对应类目。
 *
 * 笔记本走 /api/parse（大模型翻译 + 本地词典降级）；鼠标走纯本地词典（枚举映射最准，
 * 符合「能写 if-else 就别用 AI」）。键盘 / 显示器数据尚未接入。
 */

export type CategoryId = "laptop" | "keyboard" | "mouse" | "monitor";

export interface CategoryMeta {
  id: CategoryId;
  /** 「更多」菜单里显示的名字 */
  menuLabel: string;
  /** 输入框上方的问题 */
  question: string;
  /** 这类目是否已接入真实数据（机型库/词典/名录） */
  hasData: boolean;
  /** 「试试这些说法」的示例 */
  examples: string[];
  /** 输入框的 placeholder（「例如」那句话） */
  placeholder: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: "laptop",
    menuLabel: "笔记本推荐",
    question: "你想用这台笔记本做什么？",
    hasData: true,
    examples: [
      "预算 6000 以内，主要写代码，屏幕要看得清，最好轻一点",
      "打游戏，预算 8000 左右，屏幕要爽",
      "上课用，一天不用充电，背着不累",
      "剪视频，要独显，内存大一点",
    ],
    placeholder: "例如：预算 6000 以内，平时写代码，屏幕要看得清，最好轻一点",
  },
  {
    id: "keyboard",
    menuLabel: "键盘推荐",
    question: "你想用这个键盘做什么？",
    hasData: true,
    examples: [
      "打游戏，要磁轴，预算 800 以内",
      "办公打字，75% 配列，最好三模",
      "想要一把带数字区的，预算 500 左右",
    ],
    placeholder: "例如：打游戏，要磁轴，预算 800 以内",
  },
  {
    id: "mouse",
    menuLabel: "鼠标推荐",
    question: "你想用这个鼠标做什么？",
    hasData: true,
    examples: [
      "主要打游戏，续航长一点",
      "预算200以内，多个设备也可以用",
      "不要太重，办公用",
    ],
    placeholder: "例如：主要打游戏，续航长一点",
  },
  {
    id: "monitor",
    menuLabel: "显示器推荐",
    question: "你想用这个显示器做什么？",
    hasData: true,
    examples: [
      "打游戏，2K 高刷，预算 1000 以内",
      "办公看文档，27 寸 IPS，预算 800 左右",
      "看电影，要 32 寸曲面，预算 1500 左右",
    ],
    placeholder: "例如：打游戏，2K 高刷，预算 1000 以内",
  },
];

export const DEFAULT_CATEGORY: CategoryId = "laptop";

export function categoryMeta(id: CategoryId): CategoryMeta {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}
