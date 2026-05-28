// Core shared state schema for the LangGraph pipeline

export type PhaseStatus = "pending" | "running" | "done" | "error";

export interface BrandIdentity {
  name: string;
  tagline: string;
  colors: { primary: string; secondary: string; accent: string };
  fonts: { heading: string; body: string };
  tone: string;
  targetAudience: string;
}

export interface SitemapPage {
  slug: string;
  title: string;
  sections: string[];
}

export interface AgentState {
  // Input
  rawIdea: string;
  sessionId: string;

  // Phase 1: Strategy
  brandIdentity?: BrandIdentity;
  sitemap?: SitemapPage[];
  productDoc?: string;

  // Phase 2: Website
  websiteCode?: string;
  websiteUrl?: string;
  codeError?: string;
  codeFixAttempts: number;

  // Phase 3: Media
  videoScript?: string;
  voiceoverUrl?: string;
  videoClips?: string[];

  // Phase 4: Stitched output
  finalVideoUrl?: string;
  pdfUrl?: string;

  // Progress tracking
  phases: {
    strategy: PhaseStatus;
    website: PhaseStatus;
    media: PhaseStatus;
    stitching: PhaseStatus;
  };
  error?: string;
  logs: string[];
}

export interface StreamEvent {
  type: "log" | "phase" | "artifact" | "done" | "error";
  phase?: keyof AgentState["phases"];
  status?: PhaseStatus;
  message?: string;
  artifact?: {
    type: "website" | "video" | "pdf" | "voiceover";
    url: string;
    label: string;
  };
  state?: Partial<AgentState>;
}
