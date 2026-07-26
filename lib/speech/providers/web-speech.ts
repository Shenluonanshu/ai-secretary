import type { SpeechToTextProvider, TranscriptionResult } from "@/lib/speech/types";

type BrowserRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: {
        results: ArrayLike<{
          isFinal: boolean;
          [index: number]: { transcript: string };
        }>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
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

  isSupported(): boolean {
    if (typeof window === "undefined") return false;
    const win = window as SpeechWindow;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  async start(): Promise<void> {
    const win = window as SpeechWindow;
    const Recognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Recognition) throw new Error("浏览器不支持语音识别");

    this.recognition = new Recognition();
    this.recognition.lang = "zh-CN";
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++)
        text += event.results[i][0].transcript;
      const last = event.results[event.results.length - 1];
      this.resultCallbacks.forEach((cb) =>
        cb({ text, isFinal: !!last.isFinal }),
      );
    };

    this.recognition.onerror = (event) => {
      this.errorCallbacks.forEach((cb) => cb(event.error));
    };

    this.recognition.onend = () => {
      this.recognition = null;
      this.endCallbacks.forEach((cb) => cb());
    };

    this.recognition.start();
  }

  stop(): void {
    this.recognition?.stop();
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
