"use client";

/**
 * 朗读按钮：把一段文字用浏览器原生语音读出来。
 *
 * 【交互设计】
 * - 点一下开始读，再点一下停止；
 * - 只支持/不支持都给出明确状态；
 * - 纯浏览器原生，零成本、零 Key。
 */

import { useState } from "react";
import { isSpeechSynthesisSupported, speak, stopSpeaking } from "@/lib/speech";

interface SpeakButtonProps {
  /** 要朗读的文本 */
  text: string;
  /** 按钮里的标签（如「朗读解释」「朗读推荐」） */
  label?: string;
}

export default function SpeakButton({ text, label = "朗读" }: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false);

  if (!isSpeechSynthesisSupported()) {
    return null;
  }

  function handleClick() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    speak(text, {
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
    setSpeaking(true);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
        speaking
          ? "border-sky-300 bg-sky-50 text-sky-700"
          : "border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-slate-50"
      }`}
    >
      {speaking ? "🔊 停止" : `🔊 ${label}`}
    </button>
  );
}
