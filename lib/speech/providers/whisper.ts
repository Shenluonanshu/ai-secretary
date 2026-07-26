import type { SpeechToTextProvider, TranscriptionResult } from "@/lib/speech/types";
import { authFetch } from "@/lib/api";

export class WhisperProvider implements SpeechToTextProvider {
  readonly name = "whisper";
  readonly requiresNetwork = true;

  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private resultCallbacks: Array<(result: TranscriptionResult) => void> = [];
  private errorCallbacks: Array<(error: string) => void> = [];
  private endCallbacks: Array<() => void> = [];

  isSupported(): boolean {
    if (typeof navigator === "undefined") return false;
    return !!(
      typeof navigator.mediaDevices?.getUserMedia === "function" &&
      typeof MediaRecorder !== "undefined"
    );
  }

  async start(): Promise<void> {
    this.chunks = [];
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(this.chunks, {
          type: this.mediaRecorder?.mimeType || "audio/webm",
        });
        await this.transcribe(blob);
        this.stopStream();
      };

      this.mediaRecorder.onerror = () => {
        this.errorCallbacks.forEach((cb) => cb("录音失败"));
        this.stopStream();
      };

      this.mediaRecorder.start();
    } catch {
      this.errorCallbacks.forEach((cb) => cb("无法访问麦克风"));
    }
  }

  private async transcribe(blob: Blob): Promise<void> {
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const response = await authFetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        this.errorCallbacks.forEach((cb) => cb(data.error || "转写失败"));
        return;
      }

      const data = await response.json();
      this.resultCallbacks.forEach((cb) =>
        cb({ text: data.text, isFinal: true }),
      );
    } catch {
      this.errorCallbacks.forEach((cb) => cb("转写服务不可用"));
    }
  }

  stop(): void {
    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.stop();
    } else {
      this.stopStream();
    }
  }

  private stopStream(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.mediaRecorder = null;
    this.endCallbacks.forEach((cb) => cb());
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
