"use client";

/**
 * 语音输入按钮：点一下开始听，说完自动把识别结果交给 onTranscript。
 *
 * 【交互设计】
 * - 识别中显示「正在听…」，中间结果实时回显；
 * - 识别出的文字不是直接提交，而是交还给父组件填进输入框——用户还能改，
 *   守住「翻译过程可见可修改」的铁律；
 * - 不支持识别 / 报错时给出明确提示，并建议换 Edge。
 */

import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface VoiceInputButtonProps {
  /** 识别结束后的最终文本 */
  onTranscript: (text: string) => void;
  /** 是否禁用（比如正在解析时） */
  disabled?: boolean;
}

export default function VoiceInputButton({
  onTranscript,
  disabled,
}: VoiceInputButtonProps) {
  const { supported, listening, interim, error, start, stop } =
    useSpeechRecognition();

  if (!supported) {
    return (
      <span
        title="当前浏览器不支持语音输入，请换用 Edge 浏览器"
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-400"
      >
        🎤 语音输入不可用
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        {listening ? (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-rose-700"
          >
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
            正在听… 点此结束
          </button>
        ) : (
          <button
            type="button"
            onClick={() => start(onTranscript)}
            disabled={disabled}
            title="对着麦克风说出你的需求，说完自动转成文字"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            🎤 语音输入
          </button>
        )}
      </div>

      {listening && interim && (
        <span className="text-xs italic text-slate-400">“{interim}”</span>
      )}

      {error && (
        <span className="text-xs leading-5 text-rose-600">{error}</span>
      )}
    </div>
  );
}
