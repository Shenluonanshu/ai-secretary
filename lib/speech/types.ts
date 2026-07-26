export interface TranscriptionResult {
  text: string;
  isFinal: boolean;
}

export interface SpeechToTextProvider {
  readonly name: string;
  readonly requiresNetwork: boolean;
  start(): Promise<void>;
  stop(): void;
  onResult(callback: (result: TranscriptionResult) => void): () => void;
  onError(callback: (error: string) => void): () => void;
  onEnd(callback: () => void): () => void;
  isSupported(): boolean;
}
