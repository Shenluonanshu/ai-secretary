import type { SpeechToTextProvider, TranscriptionResult } from "@/lib/speech/types";

type BrowserRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<{
          isFinal: boolean;
          length: number;
          [index: number]: { transcript: string; confidence: number };
        }>;
      }) => void)
    | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
};

interface SpeechWindow extends Window {
  SpeechRecognition?: new () => BrowserRecognition;
  webkitSpeechRecognition?: new () => BrowserRecognition;
}

export class WebSpeechProvider implements SpeechToTextProvider {
  readonly name = "web-speech";
  readonly requiresNetwork = false;

  private recognition: BrowserRecognition | null = null;
  private resultCallbacks: Array<(result: TranscriptionResult) => void> = [];
  private errorCallbacks: Array<(error: string) => void> = [];
  private endCallbacks: Array<() => void> = [];
  private intentionalStop = false;
  private fullTranscript = "";
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private restartCount = 0;
  private maxRestarts = 20; // Auto-restart up to 20 times (~2 minutes total)

  isSupported(): boolean {
    if (typeof window === "undefined") return false;
    const win = window as SpeechWindow;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  async start(): Promise<void> {
    const win = window as SpeechWindow;
    const Recognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Recognition) throw new Error("浏览器不支持语音识别");

    this.intentionalStop = false;
    this.fullTranscript = "";
    this.restartCount = 0;

    this.recognition = new Recognition();
    this.recognition.lang = "zh-CN";
    this.recognition.continuous = true;   // Don't stop on silence gaps
    this.recognition.interimResults = true; // Get partial results as you speak

    this.recognition.onresult = (event) => {
      // Collect all results since last restart
      let text = this.fullTranscript;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.length > 0) {
          const transcript = result[0].transcript;
          if (result.isFinal) {
            text += transcript;
          } else {
            // Interim: show full transcript + current partial
            const interimText = this.fullTranscript + transcript;
            this.resultCallbacks.forEach((cb) =>
              cb({ text: interimText, isFinal: false }),
            );
            return;
          }
        }
      }
      // All results processed — send final cumulative result
      this.fullTranscript = text;
      this.resultCallbacks.forEach((cb) =>
        cb({ text: this.fullTranscript, isFinal: true }),
      );
    };

    this.recognition.onerror = (event) => {
      const msg = event.error === "not-allowed"
        ? "未获得麦克风权限"
        : event.error === "no-speech"
        ? "未检测到语音，请再试一次"
        : event.error === "aborted"
        ? ""
        : `语音识别出错：${event.error}`;
      if (msg) {
        this.errorCallbacks.forEach((cb) => cb(msg));
      }
      // Don't trigger end callbacks on recoverable errors
      if (event.error === "aborted" || event.error === "no-speech") {
        // Will be handled by onend → auto-restart
      } else if (event.error === "not-allowed") {
        this.stop();
      }
    };

    this.recognition.onend = () => {
      // If this is an intentional stop, notify listeners
      if (this.intentionalStop) {
        this.endCallbacks.forEach((cb) => cb());
        return;
      }

      // Auto-restart: browsers close recognition after ~1s of silence
      // even with continuous=true. Restart to keep listening through pauses.
      if (this.restartCount < this.maxRestarts) {
        this.restartCount++;
        this.restartTimer = setTimeout(() => {
          try {
            this.recognition?.start();
          } catch {
            // Already started or destroyed
            this.endCallbacks.forEach((cb) => cb());
          }
        }, 100);
      } else {
        // Max restarts reached — user has been silent too long, end naturally
        this.endCallbacks.forEach((cb) => cb());
      }
    };

    this.recognition.start();
  }

  stop(): void {
    this.intentionalStop = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    // Use abort() instead of stop() to prevent the final onresult from firing
    try {
      this.recognition?.abort();
    } catch {
      try {
        this.recognition?.stop();
      } catch { /* already stopped */ }
    }
    this.recognition = null;
  }

  onResult(callback: (result: TranscriptionResult) => void): () => void {
    this.resultCallbacks.push(callback);
    return () => {
      this.resultCallbacks = this.resultCallbacks.filter((cb) => cb !== callback);
    };
  }

  onError(callback: (error: string) => void): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter((cb) => cb !== callback);
    };
  }

  onEnd(callback: () => void): () => void {
    this.endCallbacks.push(callback);
    return () => {
      this.endCallbacks = this.endCallbacks.filter((cb) => cb !== callback);
    };
  }
}
