import type { Chapter, Graph, LearningNode } from "./protocol";
import type { Cue, Caption } from "./narration";
import type { Workspace } from "./workspace";
import type { IntakeField, IntakeQuestionRecord } from "./intake-question";
export type PageAudio = {
  status: "pending" | "generating" | "ready" | "failed";
  cues: Cue[];
  captions: Caption[];
  error?: string;
};
export type SpeechProfile = {
  provider: "elevenlabs";
  voiceId: string;
  model: string;
  languageCode?: "zh" | "en";
};
export type PackageState = {
  narrationMode?: "chapter";
  id: string;
  nodeHash: string;
  status: "queued" | "generating" | "ready" | "failed";
  speech: "not_requested" | "pending" | "generating" | "ready" | "failed";
  chapter: Chapter | null;
  cues: Cue[];
  captions?: Caption[];
  // Absence denotes a legacy whole-chapter narration package.
  pageAudio?: Record<string, PageAudio>;
  // Pin the narrator across pages/retries; older Fish packages have no profile.
  speechProfile?: SpeechProfile;
  error?: string;
};
export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  nodes?: LearningNode[];
  nodeId?: string;
};
export type LearningDepth = "foundation" | "applied" | "advanced";
export type LearnerProfile = {
  experience: string;
  purpose: string;
  priorKnowledge: string;
  depth: LearningDepth;
  studyPlan: string;
};
export type LearningAttempt = {
  nodeId: string;
  sectionId: string;
  passed: boolean;
  answer?: number;
  at: number;
  usedHelp: boolean;
  actual?: string;
  expected?: string;
};
export type NodeNote = {
  packageId?: string;
  summary: { title: string; body: string }[];
  checkpoints: {
    sectionId: string;
    title: string;
    attempts: number;
    firstPassed: boolean;
    lastPassed: boolean;
    records?: Pick<
      LearningAttempt,
      "passed" | "at" | "usedHelp" | "actual" | "expected"
    >[];
  }[];
  questions: string[];
  personal: string;
  revision: number;
};
export type DifficultyAdjustment = {
  id: string;
  fromNodeId: string;
  nodeId: string;
  previousDepth: LearningDepth;
  depth: LearningDepth;
  reason: string;
  reverted?: boolean;
};
export type BranchPreview = {
  id: string;
  baseRevision: number;
  afterId: string;
  rejoinId: string;
  nodes: LearningNode[];
  extension?: { id: string; title: string; depth: LearningDepth };
  reason?: string;
};
export type Progress = {
  time: number;
  sectionId: string;
  done: string[];
  subtitleOnly: boolean;
  follow: boolean;
};
export type Course = {
  id: string;
  sessionId: string;
  requestId: string;
  goal: string;
  language?: "zh-TW" | "en";
  scopeAccepted?: boolean;
  mode: "demo" | "live";
  status: "intake" | "planning" | "ready" | "failed";
  learningVersion?: 1;
  intake?: {
    answers: Partial<LearnerProfile>;
    revision: number;
    questions?: Partial<Record<IntakeField, IntakeQuestionRecord>>;
  };
  learnerProfile?: LearnerProfile;
  attempts?: LearningAttempt[];
  notes?: Record<string, NodeNote>;
  adjustments?: DifficultyAdjustment[];
  extensionSession?: {
    extensionId: string;
    returnNodeId: string;
    mainWorkspace: Workspace;
  };
  extensionWorkspaces?: Record<string, Workspace>;
  error?: string;
  graph: Graph | null;
  revision: number;
  currentNodeId: string;
  completed: string[];
  chapterIds: Record<string, string>;
  progress: Record<string, Progress>;
  workspace: Workspace;
  messages: Message[];
  preview: BranchPreview | null;
  confirmed: Record<string, number>;
  createdAt: number;
};
export type Snapshot = Omit<Course, "sessionId" | "requestId"> & {
  chapters: Record<string, PackageState>;
};
export type CourseSummary = Pick<
  Course,
  "id" | "goal" | "status" | "createdAt"
>;
