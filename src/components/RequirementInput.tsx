"use client";

interface RequirementInputProps {
  text: string;
  onTextChange: (value: string) => void;
  onParse: (input: string) => void;
  onReset: () => void;
  examples: string[];
}

/**
 * 输入区：用户用大白话描述需求，点「翻译成条件」。
 * 这里只负责收集文字，不关心怎么翻译——翻译逻辑在 lib/match.ts。
 */
export default function RequirementInput({
  text,
  onTextChange,
  onParse,
  onReset,
  examples,
}: RequirementInputProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <label
        htmlFor="requirement"
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        你想用这台笔记本做什么？
      </label>
      <textarea
        id="requirement"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        rows={3}
        placeholder="例如：预算 6000 以内，平时写代码，屏幕要看得清，最好轻一点"
        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none focus:border-slate-400 focus:bg-white"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onParse(text)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          翻译成条件
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
        >
          重来
        </button>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="mb-2 text-xs text-slate-400">试试这些说法：</p>
        <div className="flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                onTextChange(example);
                onParse(example);
              }}
              className="rounded-full border border-slate-200 px-3 py-1 text-left text-xs text-slate-500 transition hover:border-slate-400 hover:text-slate-800"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
