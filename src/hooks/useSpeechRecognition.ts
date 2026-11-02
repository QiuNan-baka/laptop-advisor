"use client";

/**
 * 语音识别的 React Hook：把浏览器原生 SpeechRecognition 包成一个
 * 好用的 { listening, interim, error, start, stop } 接口。
 *
 * start(onFinal) 传入一个回调，识别结束时把最终文本交出去；
 * interim 实时回显中间结果。用法见 VoiceInputButton。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getRecognitionCtor,
  isSpeechRecognitionSupported,
  type SpeechRecognitionErrorLike,
  type SpeechRecognitionLike,
} from "@/lib/speech";

export interface UseSpeechRecognitionResult {
  supported: boolean;
  listening: boolean;
  /** 中间结果（还没说完、随时会变） */
  interim: string;
  error: string | null;
  /** 开始识别，onFinal 在说完后拿到最终文本 */
  start: (onFinal: (text: string) => void) => void;
  stop: () => void;
}

/** 把各种识别错误码翻译成一句人话，方便用户知道下一步该怎么办 */
function humanizeError(event: SpeechRecognitionErrorLike): string {
  switch (event.error) {
    case "not-allowed":
    case "service-not-allowed":
      return "麦克风权限被拒绝，或浏览器不允许访问语音服务。请在地址栏允许麦克风权限，并换用 Edge 浏览器试试。";
    case "no-speech":
      return "没听到声音，请靠近麦克风再试一次。";
    case "audio-capture":
      return "找不到麦克风设备，请检查是否已连接。";
    case "network":
      return "语音服务连不上。Chrome 在国内常连不上谷歌语音服务，建议换用 Edge 浏览器。";
    case "aborted":
      return "识别已取消。";
    default:
      return `识别失败（${event.error}）。建议换用 Edge 浏览器重试。`;
  }
}

export function useSpeechRecognition(): UseSpeechRecognitionResult {
  const supported = isSpeechRecognitionSupported();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef<((text: string) => void) | null>(null);
  // 累积所有 isFinal 的片段（一句话可能被切成多段 final）
  const finalBufRef = useRef("");

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      // 还没 start 就 stop 会抛异常，忽略
    }
  }, []);

  // 卸载时释放
  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        /* 忽略 */
      }
    };
  }, []);

  const start = useCallback((onFinal: (text: string) => void) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("当前浏览器不支持语音识别，请换用 Edge 浏览器。");
      return;
    }
    setError(null);
    setInterim("");
    onFinalRef.current = onFinal;
    finalBufRef.current = "";

    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = "zh-CN";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);
    rec.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const r = event.results[i];
        const text = r[0]?.transcript ?? "";
        if (r.isFinal) {
          finalBufRef.current += text;
        } else {
          interimText += text;
        }
      }
      setInterim(interimText);
    };
    rec.onerror = (event) => {
      setListening(false);
      setError(humanizeError(event));
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      const final = finalBufRef.current.trim();
      finalBufRef.current = "";
      if (final) {
        onFinalRef.current?.(final);
      }
      onFinalRef.current = null;
    };

    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, []);

  return { supported, listening, interim, error, start, stop };
}
