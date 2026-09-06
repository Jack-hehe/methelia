import { narrationPolicy } from "./teaching-policy";
import { practiceCommands } from "./workspace";
import { templateRegistry } from "./protocol";
import {labParameterRanges} from "./lab";

export const generationPolicy = {
  protocolVersion: 2,
  nodes: { preferredMin: 4, preferredMax: 9, max: 50 },
  sections: { preferredMin: 3, preferredMax: 6, max: 10 },
  preparation: "whole-chapter-before-reading",
  requiredCheckpoints: 1,
  titleCharacters: 100,
  bodyCharacters: 800,
  narration: narrationPolicy,
  retryRepairs: 2,
} as const;

/** The same registered identifiers drive validation, prompts, and the fixed UI. */
export const learningCapabilities = {
  laboratoryParameters: labParameterRanges,
  laboratoryModels: {
    geometry: "Rotatable wireframe sphere x²+y²+z²=radius² and horizontal y=slice circular section; slice radius sqrt(radius²-slice²). Only this family, not an arbitrary equation parser.",
    calculus: "Coaster curve y=bend*x²/3 + (x>=0 ? join*x : 0). Move x to inspect tangent; join=0 removes slope discontinuity at zero.",
    probability: "Seeded independent trials. Player expected profit per play = probability*reward-cost. trials and seed change simulated sample, not theoretical expectation.",
    collision: "One-dimensional, isolated two-mass collision with restitution0..1; velocity1 nonnegative and velocity2 nonpositive. Compare momentum and kinetic energy.",
    orbit: "Normalized central gravity mu=1, planet radius0.5. speed is MULTIPLIER of circular velocity:1 is circular, sqrt2 is escape; actual initial velocity=speed/sqrt(radius). Numerical trajectory, no atmosphere.",
    circuit: "Ideal resistive load voltage/resistance; parallel=1 adds identical resistor in parallel. Bulb brightness indicates total dissipated power, not an LED model.",
    sound: "Oscillator frequency, amplitude, sine/square/saw wave and attack/release. Four saved semitone melody notes, explicit play/stop. No overlapping-note sequencer.",
    color: "Additive RGB screen-light, black/white text contrast and CSS rgb() export; no paint mixing.",
    design: "Preset science-fair poster, adjustable headline size, spacing, hue, columns and aspect ratio; SVG export. Not freeform text editing.",
    animation: "Bouncing character with duration, height, squash and linear/parabolic easing; timeline and SVG export.",
    ecosystem: "Logistic prey growth and predator interaction, fixed Euler step .1 for160 steps. Educational model, not real ecology prediction.",
    separation: "Fixed mixture 8 sand,12 salt,40 water; filter removes sand and evaporation leaves salt. No arbitrary molecular reaction engine.",
    flood: "Rain depth, percent green and storage depth. Infiltration=min(rain,30)*green/100; runoff=rain-infiltration-stored. Simplified water balance.",
    economy: "Coffee demand=round(traffic*(1-.16*(price-5))); sales=min(stock,demand); profit deducts ALL prepared cups plus fixed cost. Toy scenario, no live financial data.",
    logic: "Door opens for (gate0 ? A AND B : A OR B) AND NOT C; C is alarm. Toggle truth-table inputs.",
    pathfinding: "8x8 editable wall grid, BFS shortest four-neighbor path; fixed start0 and end63, maze presets. Not an arbitrary code editor.",
    data: "Two synthetic eight-week reading-minute series: group0 is A [10,15,12,null,20,18,26,24], group1 is B [18,22,null,30,24,35,27,40]. clean1 excludes missing weeks; clean0 replaces them with zero. Toggle bar/line chart; export cleaned CSV. No half-series filter or arbitrary CSV upload.",
  },
  version: 2,
  templates: templateRegistry,
  components: {
    "lab.experiment": "Interactive visual laboratory in any environment, focus or split template. Required kind: geometry, calculus, probability, collision, orbit, circuit, sound, color, design, animation, ecosystem, separation, flood, economy, logic, pathfinding, data; mission: concrete learner experiment in course language; optional initial: numeric parameters. Use explain/demonstrate intent; assess predictions separately with quiz.choice. These are bounded trusted models, not arbitrary code or general-purpose scientific solvers.",
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
        "Real browser Python in an isolated Pyodide worker: expressions, loops, functions and standard library. Editor, bounded text output and generated UTF-8 HTML/CSS/JS/JSON/TXT/CSV files (max20 files,200000 characters) for preview/download. Write index.html in current directory to preview a generated static website. This is NOT a Flask/Django server. No interactive input(), pip, third-party packages, GUI, network or host shell. Use /main.py or another absolute .py starter path.",
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
