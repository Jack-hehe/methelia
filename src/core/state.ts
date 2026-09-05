import type { Chapter, Graph, LearningNode } from "./protocol";
import type { Cue } from "./narration";
import type { Workspace } from "./workspace";
export type PackageState = {
  id: string;
  nodeHash: string;
  status: "queued" | "generating" | "ready" | "failed";
  speech: "pending" | "generating" | "ready" | "failed";
  chapter: Chapter | null;
  cues: Cue[];
  error?: string;
};
export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  nodes?: LearningNode[];
};
export type BranchPreview = {
  id: string;
  baseRevision: number;
  afterId: string;
  rejoinId: string;
  nodes: LearningNode[];
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
  mode: "demo" | "live";
  status: "planning" | "ready" | "failed";
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
