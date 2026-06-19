type DograhWidgetStatus = "idle" | "connecting" | "connected" | "failed";

interface DograhWidgetCallEndData {
  transcript?: string;
  duration?: number;
}

interface DograhWidgetAPI {
  start(): void;
  end(): void;
  onStatusChange(handler: (status: DograhWidgetStatus) => void): void;
  onCallStart(handler: () => void): void;
  onCallEnd(handler: (data?: DograhWidgetCallEndData) => void): void;
  onError(handler: (error: Error) => void): void;
}

declare global {
  interface Window {
    DograhWidget?: DograhWidgetAPI;
  }
}

export {};
