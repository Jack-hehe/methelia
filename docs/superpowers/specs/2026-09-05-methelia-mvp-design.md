# Methelia MVP design

Date: 2026-09-05
Status: Approved by user on 2026-09-05; initial implementation underway. Current capabilities and explicit implementation limits are recorded in README.md.
Canonical vocabulary: [CONTEXT.md](../../../CONTEXT.md).

## 1. Product outcome and scope

Methelia is the project name. The MVP takes a learner's website-building goal, generates a complete Course Graph, and teaches it through small, fully prepared interactive chapters. The first supported subject area is introductory HTML, CSS, and browser JavaScript. Course content and the graph are generated from the request; the UI templates and execution components are authored and tested ahead of time.

The end-to-end acceptance journey is: enter a goal → see a generated Learning Map → study a narrated chapter → edit a website and observe its preview → ask a question → approve a support branch → complete that branch and rejoin the main course → refresh and resume the same work.

The learner's final artifact is a working static website in the Learning Workspace, exportable as files for publishing. The course can explain publishing, but automatic deployment to a hosting provider is outside this local MVP. Completion must distinguish a working/exported site from an actually published URL.

The initial product has one anonymous learner session per browser, one fixed narrator, light mode by default, and an optional dark mode. Authentication, billing, collaboration, multiple voices, lip sync, general-purpose OS terminals, backend app execution, and arbitrary subject coverage are deferred.

The existing HTML mockups under `.superpowers/brainstorm/` are disposable visual references. The primary visual reference is `scrolling-lesson-light-v1.html`. They do not constitute a production application or demonstrate working AI/TTS integration.

## 2. Approach and trade-offs

Use a TypeScript modular monolith with a Next.js web application, SQLite persistence, local audio storage, and a single background worker. This keeps the first complete workflow locally runnable while separating protocol, generation, narration, graph management, and workspace responsibilities.

Generating arbitrary UI for each lesson would make component behavior difficult to validate. A fixed library of complete courses would prevent learning goals from shaping the course. The chosen design therefore fixes the component vocabulary while allowing the AI to generate objectives, graph structure, explanations, examples, practice inputs, and narration.

All detailed content for a small chapter is prepared before the chapter begins. Generating the entire course's detailed chapters upfront would delay entry and waste work after a branch changes the route. Generate the full graph first, then the current chapter and prefetch the next chapter; permit a maximum of two prefetched chapters.

## 3. Learner interface

### Entry and generation

The entry screen centers “What do you want to learn?” and a conversational input. Suggested prompts are optional examples, not predefined course selectors. On submission, show useful generation phases, then the complete Learning Map as soon as the graph has validated. A chapter opens when its content and narration are ready, or when the learner explicitly accepts subtitle-only mode after a speech failure.

Requests beyond browser website fundamentals receive an honest scope explanation and a suggested supported goal. Do not silently substitute an unrelated fixed course or claim an unsupported runtime exists.

### Course Player

The course occupies the main screen beneath a compact header. All Lesson Sections for the current chapter appear in one continuous scrollable document. Section layouts vary with purpose: explanation and diagram, comparison, or an explanation beside a working editor/preview/terminal. On small screens, the practice panel stacks with its section and remains reachable without covering narration controls.

A compact circular Speaker Avatar uses a neutral placeholder until the user supplies artwork. Speech may animate a simple speaking indicator. Subtitles and compact bottom controls provide play/pause, seek, volume, playback rate, and follow-narration. Text remains selectable and readable when playback is paused.

Following narration highlights and scrolls to the relevant Lesson Section. Manual scrolling suspends automatic scrolling without stopping speech; a visible “follow explanation” control resumes it. Respect reduced-motion preferences. A Help Drawer pauses speech and preserves its cursor. Closing the drawer does not automatically resume sound.

Practice checkpoints pause narration and focus the relevant component. Scrubbing may navigate content, but cannot mark unsatisfied practice complete. When seeking forward past an incomplete required checkpoint, stop at the earliest incomplete checkpoint. Rewinding never clears saved exercise completion or overwrites workspace files.

### Learning Map

A small fixed corner preview shows the current node and nearby route. Opening it replaces the course view with a full-viewport, opaque Learning Map overlay. Background content is visually hidden, inert, and cannot scroll or receive focus. Close and Escape restore the prior focus and course scroll position. Opening the map pauses narration; closing preserves the paused state.

The map supports panning, zooming, fit-to-view, node selection, and requesting new nodes. It distinguishes current, completed, planned, generating, and failed states using labels/icons as well as color. Node positions are view preferences; dragging a node does not rewrite dependencies.

Selecting a completed node permits review. Selecting an upcoming node shows its objective and prerequisites. The main route advances through eligible nodes; bypassing prerequisites is not silently permitted. Adding nodes uses a validated Branch Preview and confirmation, not arbitrary unvalidated edge editing.

## 4. Course Graph and revisions

A Course Graph is a directed acyclic graph. Each Learning Node defines a stable ID, title, one learning objective, prerequisites, estimated duration, kind (`main` or `support`), and required completion evidence. The graph defines an entry node and terminal outcomes. Ordering dependencies and learning prerequisites must agree; all nodes must be reachable and able to reach an outcome. The initial planner emits one ordered main route with prerequisite links; support branches add explicit detours. The active route has a deterministic next node, rather than asking the learner to resolve multiple automatic successors.

Persist immutable Graph Revisions and a course's active revision pointer. Keep learner completion records separate from graph structure. Learning Map state combines the active graph with progress and chapter-generation status. This prevents a playback update from producing a structural graph revision.

Completed nodes and the active node's objective/content binding are preserved across revisions. Future nodes may be added or replanned. Existing generated packages remain immutable and are reused only when their node definition and prerequisite context are unchanged. A stale worker result cannot replace a newer node binding.

For the MVP, a support branch inserts a sequence after the active node and before its previously planned successor. That successor is the named Rejoin Point. The branch is visible immediately after confirmation but entered at the current chapter boundary. Its rejoin edge points forward to a not-yet-completed node, so returning to the main route does not create a graph cycle. At a terminal node, recommendations are offered as a follow-up course goal rather than fabricating a nonexistent rejoin point.

Confirming a branch supplies the revision on which its preview was based. The server checks that it is still current, validates the proposed graph, and atomically inserts the new revision and updates the active pointer. If it is stale, return a conflict and regenerate the preview. Repeated confirmation of the same request returns the same revision. Only one pending preview is confirmable at a time; further requests include any already accepted support path.

## 5. Chapter Package protocol

One Learning Node is delivered by one complete Chapter Package. A package contains:

| Field                                | Meaning                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `schemaVersion`                      | Version of the supported protocol                                       |
| `id`, `nodeId`, `nodeDefinitionHash` | Immutable package identity and validated node binding                   |
| `objective`                          | The node objective this chapter teaches                                 |
| `document.sections`                  | All ordered Lesson Sections and component instances                     |
| `script.segments`                    | Full narration text, section references, and cue anchors                |
| `checkpoints`                        | Practice pauses linked to explicit completion conditions                |
| `completion`                         | Conditions required to finish the node                                  |
| `workspaceSetup`                     | Initial file additions and explicit, non-destructive setup requirements |

A Lesson Section has a stable ID, an intent, an allowlisted template, and typed component slots. Initial intents are `explain`, `demonstrate`, `practice`, and `check`. Clarification occurs in the Help Drawer or a separate Support Node, never as newly generated content inserted into an active chapter.

Initial templates are `narrative`, `focus`, `split`, `workspace`, and `compare`. Initial Learning Components are `concept.canvas`, `dom.explorer`, `code.editor`, `terminal`, `file.tree`, `browser.preview`, and `quiz.choice`. A central registry owns each component's versioned input schema, allowed actions, emitted events, and compatible slots. `concept.canvas` accepts bounded diagram primitives and labels, not arbitrary executable UI.

Narration cues reference stable section/component IDs and a closed set of actions such as highlighting an element or switching an explanatory tab. They do not contain JavaScript. Practice completion uses a closed set of evaluators, such as a preview DOM assertion, expected file content, a recognized workspace command result, or a quiz answer. AI-provided evaluator code is forbidden.

Validate schema, unique IDs, references, supported templates and slots, resource limits, allowed commands/actions, checkpoint consistency, and objective binding. Validate graph invariants independently before node generation. Content/schema validation does not prove pedagogical accuracy; inspect generated examples and exercise solvability during acceptance testing.

The package is generated as a whole, optionally repaired as a whole before use, and published atomically after validation. Runtime state such as answers, open tabs, editor buffers, and narration cursor is stored separately. Once active, its structure never changes. Workspace initialization adds missing starter files only; existing learner files require explicit consent before replacement.

## 6. Generation and readiness

The pipeline is: goal → Course Planner → graph validation → Node Generator → complete Chapter Package → protocol validation → Fish narration and alignment → ready chapter.

Graph and chapter generation use a server-side model adapter with structured JSON output. Deployment configuration supplies the model endpoint, model ID, and credential; no particular vendor or model is embedded in the protocol. The initial adapter targets a configured chat-completions-compatible endpoint, then parses and validates the response independently of provider-side schema enforcement. Missing configuration produces an actionable configuration error. Deterministic fixtures are reserved for explicitly labeled development/demo mode and tests.

Generation jobs are persisted in SQLite with an idempotency key, status, attempts, lease expiry, and safe error summary. One worker claims jobs transactionally and renews its lease. Interrupted jobs are recoverable after lease expiry. Deduplicate work using the node definition/context hash and protocol version; do not deduplicate across unrelated learner workspaces.

Content states are `queued`, `generating`, `validating`, `content_ready`, and `failed`. Speech states are `pending`, `generating`, `ready`, and `failed`. Normal chapter entry requires `content_ready` plus speech `ready`. Speech failure permits an explicit subtitle-only entry using the complete validated package. No mid-chapter generation is needed for either mode.

Allow up to two AI repair attempts after an invalid output. Persist the last valid graph and active chapter if generation fails. Display retry and a useful error state without exposing model credentials or raw internal exceptions.

Prefetch the next eligible chapter at lower priority than current work. Accepted graph changes invalidate obsolete future jobs/bindings; they do not alter the active chapter. The UI receives phase updates through status polling in the MVP. Streaming partial chapter HTML into the active course is outside the protocol.

## 7. Fish Audio and synchronization

Use one narrator configured with server-only `FISH_AUDIO_API_KEY` and `FISH_AUDIO_REFERENCE_ID`. The avatar is an independent static asset. Credentials go into local environment configuration, never into chat, client bundles, browser storage, or committed files.

Build one full narration text from the package's ordered script segments and send one logical synthesis request for the chapter. Consume Fish's timestamped response when supported by the configured service, store the complete audio track, and map alignment to script segments and cue anchors. Persist the exact synthesized text and mapping with the audio artifact. A provider's internal streaming chunks do not become independently generated lesson sections.

Before synthesis, enforce the provider adapter's supported text limit. If a generated chapter exceeds it, shorten/repair the whole package before entry; do not discover the problem midway through playback. If audio is returned without usable alignment, treat synchronization preparation as failed rather than inventing precise timestamps.

Use the audio element's current time as the authoritative narration clock. Seeking, rate changes, and resuming recompute subtitle/highlight state from that time. Practice pauses happen at cue boundaries. Cues must be deterministic when revisited and must never replay destructive workspace setup or automatically submit an answer.

Retry transient Fish failures up to three total attempts with backoff. Invalid credentials and non-retryable input errors fail immediately. After failure, offer retry or explicit subtitle-only learning. Subtitle-only mode shows the complete script beside its sections and uses manual progression; it does not simulate speech or pretend timed alignment exists. If a later audio retry succeeds while this mode is active, offer narration on reopening the chapter rather than switching modes automatically.

Audio cache identity includes package/script hash, narrator reference, synthesis settings, and adapter version. Serve artifacts through a session-authorized route and support seeking. Store timing/metadata in SQLite and binary audio in an ignored local data directory. Pin implementation to verified provider documentation and test one real chapter before claiming the Fish integration works.

Reference documentation for implementation verification:

- [Fish text-to-speech](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech)
- [Fish streaming with timestamps](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech-stream-with-timestamps)

## 8. Shared Learning Workspace

Editor, File Tree, Terminal, and Browser Preview operate on one persistent virtual file tree scoped to the course and learner session. The server stores the authoritative file revision. The editor buffers changes, saves with a base revision, and shows save/conflict state. Preview and command execution use the latest accepted workspace snapshot; run/preview actions flush pending edits first.

The terminal is a stable input/output component backed by a deterministic command adapter. Initial commands are `pwd`, `ls`, `cd`, `mkdir`, `touch`, `cat`, `clear`, and the explicitly supported `python -m http.server 8000` lesson command. That final command activates the website preview through an educational adapter; it does not run host Python. Label the environment as a website practice terminal and document its supported commands. Unsupported commands return a truthful, deterministic explanation.

Do not execute arbitrary shell commands on the application host. Normalize virtual paths and reject traversal beyond the virtual root. The browser preview supports HTML, CSS, and browser JavaScript through a sandboxed frame with no application-origin authority. Restrict networking and navigation in the MVP. Resolve course-local assets through the preview adapter. Parent/frame communication validates message source, schema, and a per-frame nonce, including exercise evidence messages.

Save completion based on validated workspace state or known evaluator outputs, not arbitrary client-submitted “passed” values. Exercises are learning aids, not a tamper-proof grading system. Limit file sizes, output lengths, and request sizes to protect the local app.

Python interpreters, package installation, Node.js backend servers, arbitrary binaries, and container orchestration require later runtime adapters. The MVP must not suggest these capabilities are already available.

## 9. Help and support branches

Help requests include the current node/package IDs, referenced Lesson Section, learner question, and the minimum relevant workspace context. Treat questions, source files, and generated content as untrusted data; they cannot change server instructions, expose secrets, or authorize tools.

Answer small questions inside the Help Drawer. When a knowledge gap warrants extra instruction, offer one to three Support Node recommendations containing objective, reason, estimated duration, prerequisites, insertion location, and Rejoin Point. Recommendations are optional and are not generated for every small question.

The learner can review/remove suggestions, preview the result in the Learning Map, and confirm. Only confirmation mutates the graph through a new revision. Generate accepted support chapters in the background; keep the current Chapter Package stable until its boundary. Store chat and recommendations so reopening the drawer restores context. Model responses cannot directly run terminal commands or confirm graph changes.

## 10. Backend boundaries and storage

| Module             | Owns                                      | Interface/dependencies                              |
| ------------------ | ----------------------------------------- | --------------------------------------------------- |
| Protocol           | Schemas, registry, validation             | Pure validation; no provider or database dependency |
| Course planning    | Goal to graph and revision proposals      | Model adapter and protocol validation               |
| Chapter generation | Node/context to complete package          | Model adapter and protocol validation               |
| Narration          | Script to stored audio and alignment      | Fish adapter and artifact storage                   |
| Graph management   | Revision validation and atomic activation | SQLite repositories                                 |
| Workspace          | Virtual files, command adapter, evidence  | Workspace repository and bounded evaluators         |
| Learning progress  | Cursor, checkpoints, node completion      | Package bindings and progress repository            |
| Help               | Answers and optional branch proposals     | Model adapter, active chapter and graph context     |
| Worker             | Durable generation orchestration          | Jobs and module interfaces                          |

SQLite entities are `learner_sessions`, `courses`, `graph_revisions`, `chapter_packages`, `learning_workspaces`, `progress_events`, `help_messages`, `generation_jobs`, and `audio_artifacts`. The last two make background recovery and audio caching explicit. Graphs and chapter protocols are versioned JSON documents; frequently queried identities/statuses have separate indexed columns.

Use an unguessable HttpOnly SameSite session cookie, Secure under HTTPS. All resource requests verify ownership through that session. Local HTTP development is an explicit environment exception to Secure cookies. Mutating routes validate same-origin requests. Never put the session credential in a query string.

Persist the active graph revision, current node/package, satisfied checkpoints, narration time, scroll anchor, follow setting, help history, and workspace revision. Persist progress on pause/checkpoint/navigation and periodically while playing. Reopening restores the paused state, without autoplay. If local storage/database is removed or the anonymous cookie is lost, cross-device/account recovery is unavailable in this MVP.

Key API surface:

| Endpoint                               | Responsibility                                  |
| -------------------------------------- | ----------------------------------------------- |
| `POST /api/sessions`                   | Create or recover the anonymous session         |
| `POST /api/courses`                    | Submit goal and enqueue planning                |
| `GET /api/courses/:courseId`           | Active graph, progress and generation status    |
| `GET /api/chapters/:chapterId`         | Authorized immutable chapter and audio metadata |
| `GET /api/chapters/:chapterId/status`  | Content/speech readiness                        |
| `POST /api/chapters/:chapterId/retry`  | Idempotent retry of failed preparation          |
| `GET /api/audio/:artifactId`           | Authorized audio with range support             |
| `POST /api/progress/events`            | Validate and persist progress/checkpoint events |
| `POST /api/help/messages`              | Answer and optionally recommend nodes           |
| `POST /api/branches/preview`           | Validate proposal against a base revision       |
| `POST /api/branches/confirm`           | Atomically activate an accepted revision        |
| `GET /api/workspace?courseId=…`        | Read the course's shared workspace              |
| `PUT /api/workspace/files`             | Save with course ID and base workspace revision |
| `POST /api/workspace/commands`         | Run a supported command in that workspace       |
| `GET /api/workspace/export?courseId=…` | Download the website files                      |

Generation entry points have request deduplication and session concurrency limits to avoid duplicate paid calls. Persist errors for diagnostics with secret redaction. Do not log complete private prompts or source files by default.

## 11. Verification and acceptance

Use deterministic model and speech adapters for repeatable automated tests, clearly separated from live-provider mode. Verify:

1. Two different supported goals reach the planner and produce goal-dependent graphs in live smoke testing. A fixed fixture is never reported as AI-generated content.
2. Graph validation rejects cycles, missing prerequisites, unreachable nodes, invalid rejoin points, and revisions that mutate completed/current node bindings.
3. Chapter validation rejects unsupported components/actions, broken cue references, unsatisfiable checkpoint references, and invalid workspace initialization. Invalid generation never becomes active.
4. A complete chapter is rendered before entry, speech follows its sections, manual scrolling suspends following, seeking respects required checkpoints, and no content generation modifies the active chapter.
5. Editor changes, terminal file reads, preview rendering, and refresh recovery observe the same saved workspace revision. Unsupported commands never reach the host shell.
6. Help pauses narration; rejecting a recommendation leaves the graph unchanged; confirming one adds a valid branch, preserves the current chapter, and rejoins the original future node after completion.
7. Map opening fully covers and disables the background, closes with Escape/button, and restores focus/scroll. Light/dark modes, keyboard navigation, responsive practice layouts, and subtitles remain usable.
8. Speech failure supports retry and explicit subtitle-only learning. Missing keys produce configuration errors. No secret appears in client assets or API error responses.
9. Refresh and worker restart recover session progress and pending jobs. Duplicate requests cannot create duplicate revisions or activate stale generation output.
10. A configured live model and Fish narrator generate one real complete chapter, produce playable audio with verified section alignment, and allow completing an exercise before proceeding. This live check is required to call the integration end-to-end; absent credentials must be reported as unverified.

Use protocol/unit tests for graph and timing invariants, component contract tests for supported inputs/events, API integration tests for persistence and revision conflicts, and browser end-to-end tests for the main journey and support branch. Inspect the actual rendered UI in light and dark modes. Keep automated checks focused on observable behavior rather than mirroring component implementation.

## 12. Delivery order

Implement one continuous website-learning journey in increments: protocol and persistence → generated graph and full-screen Learning Map → complete scrollable chapter rendering → shared workspace and exercises → Fish narration/cues → Help Drawer and support branch revisions → recovery and full journey verification.

Each increment runs through the same session/course/node identifiers. Provider credentials and final avatar assets are runtime inputs, so their absence does not block protocol, UI, persistence, or adapter development. Live generation and speech cannot be claimed working until those inputs are configured and exercised.
