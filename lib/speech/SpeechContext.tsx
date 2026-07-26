"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SpeechToTextProvider, TranscriptionResult } from "@/lib/speech/types";
import { WebSpeechProvider } from "@/lib/speech/providers/web-speech";
import { WhisperProvider } from "@/lib/speech/providers/whisper";

interface SpeechContextValue {
  provider: SpeechToTextProvider;
  isListening: boolean;
  lastResult: TranscriptionResult | null;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  supported: boolean;
}

const SpeechContext = createContext<SpeechContextValue | null>(null);

const PROVIDER_KEY = "speech_provider";

function createProvider(name: string): SpeechToTextProvider {
  switch (name) {
    case "whisper":
      return new WhisperProvider();
    case "web-speech":
    default:
      return new WebSpeechProvider();
  }
}

function getStoredProvider(): string {
  if (typeof window === "undefined") return "web-speech";
  return localStorage.getItem(PROVIDER_KEY) || "web-speech";
}

export function SpeechProvider({ children }: { children: ReactNode }) {
  const [providerName, setProviderName] = useState(getStoredProvider);
  const [provider, setProvider] = useState<SpeechToTextProvider>(() =>
    createProvider(getStoredProvider()),
  );
  const [isListening, setIsListening] = useState(false);
  const [lastResult, setLastResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(provider.isSupported());
  }, [provider]);

  const startListening = useCallback(async () => {
    setError(null);
    setLastResult(null);
    try {
      await provider.start();
      setIsListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "语音启动失败");
    }
  }, [provider]);

  const stopListening = useCallback(() => {
    provider.stop();
    setIsListening(false);
  }, [provider]);

  // Bind callbacks on mount
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    unsubs.push(
      provider.onResult((result) => {
        setLastResult(result);
        if (result.isFinal) {
          setIsListening(false);
        }
      }),
    );
    unsubs.push(
      provider.onError((err) => {
        setError(err === "not-allowed" ? "未获得麦克风权限" : `语音识别失败：${err}`);
        setIsListening(false);
      }),
    );
    unsubs.push(
      provider.onEnd(() => {
        setIsListening(false);
      }),
    );
    return () => unsubs.forEach((fn) => fn());
  }, [provider]);

  const switchProvider = useCallback(
    (name: string) => {
      const newProvider = createProvider(name);
      setProvider(newProvider);
      setProviderName(name);
      localStorage.setItem(PROVIDER_KEY, name);
    },
    [],
  );

  return (
    <SpeechContext.Provider
      value={{
        provider,
        isListening,
        lastResult,
        error,
        startListening,
        stopListening,
        supported,
      }}
    >
      {children}
    </SpeechContext.Provider>
  );
}

export function useSpeech(): SpeechContextValue {
  const ctx = useContext(SpeechContext);
  if (!ctx) throw new Error("useSpeech must be used within SpeechProvider");
  return ctx;
}
