"use client";

import { useState } from "react";
import VoiceInputButton from "@/components/VoiceInputButton";

interface RequirementInputProps {
  text: string;
  onTextChange: (value: string) => void;
  onParse: (input: string) => void;
  onReset: () => void;
  examples: string[];
  /** 正在等模型回复 */
  loading: boolean;
  /** 上一次调用的错误（限流、断网等） */
  error: string | null;
  /** 用户自带的 Key，可选 */
  userKey: string;
  onUserKeyChange: (value: string) => void;
}

/**
 * 输入区：用户用大白话描述需求，点「翻译成条件」。
 * 这里只负责收集文字，不关心怎么翻译——翻译逻辑在 lib/ai。
 */
export default function RequirementInput({
  text,
  onTextChange,
  onParse,
  onReset,
  examples,
  loading,
  error,
  userKey,
  onUserKeyChange,
}: RequirementInputProps) {
  const [keyOpen, setKeyOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 ease-out hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-xl">
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
        onKeyDown={(e) => {
          // Ctrl/Cmd + Enter 直接提交，长文本时比去点按钮顺手
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            if (!loading) onParse(text);
          }
        }}
        rows={3}
        disabled={loading}
        placeholder="例如：预算 6000 以内，平时写代码，屏幕要看得清，最好轻一点"
        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none focus:border-slate-400 focus:bg-white disabled:opacity-60"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onParse(text)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && (
            <span
              aria-hidden
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          {loading ? "正在分析…" : "翻译成条件"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
        >
          重来
        </button>
        <VoiceInputButton onTranscript={onTextChange} disabled={loading} />
        <span className="text-xs text-slate-400">
          也可以按 Ctrl + Enter 提交
        </span>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
          {error}
        </p>
      )}

      {/* 访客自带 Key：默认折叠，不用的人永远看不到 */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setKeyOpen((v) => !v)}
          className="text-xs text-slate-400 transition hover:text-slate-600"
        >
          {keyOpen ? "− 收起" : "+ 用自己的 API Key 试一下（可选）"}
        </button>
        {keyOpen && (
          <div className="mt-2 space-y-1.5">
            <input
              type="password"
              value={userKey}
              onChange={(e) => onUserKeyChange(e.target.value)}
              placeholder="sk-...  留空就用服务端配置的 Key"
              autoComplete="off"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-slate-400 focus:bg-white"
            />
            <p className="text-xs leading-5 text-slate-400">
              这个 Key 只随本次请求发给后端，不写进浏览器存储、不写日志、不回显。
              Key 永远不经过浏览器去直连大模型。
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="mb-2 text-xs text-slate-400">试试这些说法：</p>
        <div className="flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              disabled={loading}
              onClick={() => {
                onTextChange(example);
                onParse(example);
              }}
              className="rounded-full border border-slate-200 px-3 py-1 text-left text-xs text-slate-500 transition hover:border-slate-400 hover:text-slate-800 disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
