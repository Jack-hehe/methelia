import { practiceCommands } from "./workspace";
import { templateRegistry } from "./protocol";

export const generationPolicy = {
  protocolVersion: 2,
  nodes: { preferredMin: 4, preferredMax: 9, max: 50 },
  sections: { preferredMin: 3, preferredMax: 6, max: 10 },
  preparation: "whole-chapter-before-reading",
  requiredCheckpoints: 1,
  titleCharacters: 100,
  bodyCharacters: 800,
  narration:
    "One complete script per page. Prefer 40-180 Chinese characters or 30-80 English words per page.",
  retryRepairs: 2,
} as const;

/** The same registered identifiers drive validation, prompts, and the fixed UI. */
export const learningCapabilities = {
  version: 2,
  templates: templateRegistry,
  components: {
    "lesson.article":
      "Non-interactive reading page: 1-4 concise paragraphs, one takeaway, optional figure with 2-5 labelled items (label, description) and caption, rendered as a progressive illustrated process. Use for explanations in any subject; not every page needs interaction.",
    "concept.canvas":
      "Select a card to compare concise explanations. variant=cards is subject independent; web.languages is an explicit HTML/CSS/JS experiment (exactly three cards in that order).",
    "steps.sequence":
      "Select one of 2-6 steps to inspect an ordered procedure; each has title and body.",
    "diagram.flow":
      "Select a node in a 2-6-item directional flow to reveal its description. Each item has label and description.",
    "quiz.choice":
      "Multiple-choice understanding check with one answer and explanation.",
    "dom.explorer": "Inspect fixed DOM elements; web only.",
    "code.editor":
      "Editable prepared file plus the environment's preview/output; choose correct language.",
    terminal:
      "Run supported virtual file commands; never arbitrary host shell.",
    "file.tree": "Inspect the actual saved virtual file/directory state.",
    "browser.preview":
      "Render learner HTML/CSS/browser JavaScript in a sandbox; web only.",
  },
  environments: {
    none: {
      purpose:
        "Concepts in any subject: explanations, comparisons, procedures, diagrams, quizzes. No workspace, terminal, or required website output.",
    },
    web: {
      purpose:
        "Build static websites using HTML, CSS and browser JavaScript. File editor and live browser preview. No npm, backend/server, package install or automatic deployment.",
    },
    python: {
      purpose:
        "Real browser Python in an isolated Pyodide worker: beginner expressions, variables, loops, functions and standard library. Editor and bounded text output. No interactive input(), pip, third-party packages, GUI, network or host shell. Use /main.py or another absolute .py starter path.",
    },
    terminal: {
      purpose:
        "Linux-style file/navigation exercises in a persistent virtual filesystem, NOT a full Linux OS or Bash. No package installation, flags, pipes, redirection, deletion or real processes.",
      commands: practiceCommands,
    },
  },
  checkpoints: [
    "quiz",
    "file.includes",
    "file.exists",
    "directory.exists",
    "cwd.equals",
  ],
} as const;
