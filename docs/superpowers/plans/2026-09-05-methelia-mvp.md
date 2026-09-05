# Methelia MVP Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task in this session. User approved the spec and explicitly requested immediate development.

**Goal:** Deliver the complete local website-learning flow, including protocol-driven chapters, persisted practice, graph branches, and a configured Fish integration.

**Architecture:** Next.js serves a React client and session-authorized JSON endpoints. Pure protocol/workspace modules sit beneath SQLite repositories and a durable single worker. AI and speech are server-side adapters; an explicitly selected demo is available without credentials.

**Tech Stack:** TypeScript, Next.js, React, Zod, Node SQLite, Vitest, Playwright, CSS, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-09-05-methelia-mvp-design.md` (approved by user 2026-09-05).

## Global Constraints

- One Learning Node is delivered by one complete Chapter Package.
- Once active, its structure never changes.
- Use one narrator configured with server-only `FISH_AUDIO_API_KEY` and `FISH_AUDIO_REFERENCE_ID`.
- The initial product has one anonymous learner session per browser, one fixed narrator, light mode by default, and an optional dark mode.
- Deterministic fixtures are reserved for explicitly labeled development/demo mode and tests.
- Do not execute arbitrary shell commands on the application host.
- Live-provider checks require locally configured credentials; report their absence without claiming synthesis succeeded.

## Task 1: Protocol and shared workspace foundation

Files: `package.json`, `tsconfig.json`, `.gitignore`, `src/core/protocol.ts`, `src/core/graph.ts`, `src/core/workspace.ts`, `src/core/fixtures.ts`, `tests/core.test.ts`.

Interfaces: `validateGraph(input): Graph`; `validateChapter(input): Chapter`; `insertBranch(graph, afterId, nodes): Graph`; `runCommand(workspace, command): {workspace, output}`. Graph is an ordered DAG with explicit edges and prerequisite IDs. Chapter sections contain typed components, narration and completion conditions. Workspace is a versioned virtual file/directory map.

- [x] Write behavior tests rejecting cycles, duplicate IDs, unsupported components, invalid cue references, root traversal, and confirming that terminal/editor share files. Example: `expect(runCommand(workspace, 'cat index.html').output).toBe('<h1>Hello</h1>')`.
- [x] Run `npm test -- tests/core.test.ts`, observe missing behavior failures.
- [x] Implement Zod boundaries and semantic validators; insert support routes immutably. Command adapter accepts only the supported grammar and never calls a host shell.
- [x] Run tests and `npm run typecheck`; review and commit the foundation.

## Task 2: SQLite sessions, jobs, course lifecycle and providers

Files: `src/server/db.ts`, `src/server/service.ts`, `src/server/model.ts`, `src/server/worker.ts`, `src/server/fish.ts`, `src/core/narration.ts`, `src/app/api/[...path]/route.ts`, `tests/service.test.ts`, `tests/narration.test.ts`, `.env.example`.

Interfaces: `LearningService.mutate(sessionId, courseId, fn)` owns transactional mutations; `generateGraph(goal)` and `generateChapter(node, goal, workspace)` return validated values; `synthesize(chapter)` returns a complete artifact with section timestamps. SQLite owns sessions, course state, immutable revisions/packages, jobs, messages and audio records.

- [x] Test ownership failures, stale workspace revisions, duplicate branch confirmation, required checkpoint enforcement, persisted restart recovery, and invalid alignment. Example: `expect(() => service.getCourse(otherSession, course.id)).toThrow()`.
- [x] Run the new tests and observe expected failures.
- [x] Implement same-origin session APIs, bounded requests and transaction guards. Store jobs durably; claim with a lease, retry content repairs twice and transient speech errors three total attempts. Use a single worker process launched beside Next.js.
- [x] Implement Fish SSE parsing of `audio_base64` and cumulative `alignment.segments`, matching normalized script text to sections; fail on mismatch. Cache only complete artifacts and serve authorized byte ranges.
- [x] Configure model endpoint/key/ID through server env, parse model JSON and validate before activation. Missing keys return configuration errors; demo selection never calls providers.
- [x] Run service/narration tests, verify no credential is returned, review and commit.

## Task 3: Complete course interface and live workspace

Files: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/components/learning-app.tsx`, `src/components/course-player.tsx`, `src/components/learning-map.tsx`, `src/components/lesson-section.tsx`, `src/components/workspace-panel.tsx`, `src/components/help-drawer.tsx`, `src/components/audio-controls.tsx`, `src/core/preview.ts`, `tests/preview.test.ts`, `tests/browser.spec.ts`.

Interfaces: Client requests course/status snapshots and saves explicit actions through the API. Renderer consumes validated `Chapter`. Workspace panel shares one saved workspace snapshot. Player uses real audio currentTime and saved section anchors.

- [x] Write browser journey: choose labeled demo, inspect full chapter, open opaque map, close with Escape, edit website, run terminal command, verify preview, reload, ask for support, confirm branch and inspect map. Write preview isolation tests before implementing the compiler.
- [x] Run the new tests and observe missing UI/preview behavior.
- [x] Build responsive warm-light UI with a distinct violet/ink identity, compact narrator, varied chapter sections and side practice area. Add accessible dialog focus handling, map pan/zoom and draggable view positions.
- [x] Implement isolated preview with restricted CSP and local CSS/JS composition; sandbox learner code and reject external asset imports. Save files with revision conflict handling before preview and terminal operations.
- [x] Implement real narration, section following/manual-scroll suspension, checkpoint seek clamping, subtitles, theme persistence, and explicit subtitle-only entry after speech failure.
- [x] Implement persisted Help Drawer, optional recommendations, branch preview/confirmation, current-node pinning and next-node advancement.
- [x] Run browser tests, review screenshots at desktop/mobile and dark/light, review and commit.

## Task 4: Recovery, documentation and handoff

Files: `README.md`, `tests/browser.spec.ts`, `tests/service.test.ts`, this plan and spec status.

- [x] Add regression cases for discovered integration failures before fixing them.
- [x] Run `npm test`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`.
- [x] If credentials exist, generate a real graph and complete narrated chapter; otherwise explicitly record live AI/Fish validation as pending credentials.
- [x] Document `npm install`, `.env.local` configuration, `npm run dev`, separate worker lifecycle, demo mode, supported terminal commands, database/audio location, export and MVP runtime limits.
- [x] Start the local application, confirm HTTP response and provide its URL plus verification evidence. Leave changes on a feature branch without publishing or merging.

## Execution record — 2026-09-05

Local implementation and automated verification are complete. Live AI and Fish account verification remains pending the user's locally configured credentials. Automated provider tests use isolated test doubles; the worker integration test runs a real child process against a local model double. UI tests run the explicitly labeled demo course.

Implementation choices: audio bytes live in SQLite BLOB records; workspace and help history live in course JSON; graph revisions and chapter packages are separate immutable records. Supported cues are section-level narration anchors. The UI is implemented in the existing workspace on `feat/methelia-mvp`; original prototype and personal configuration directories were preserved. All changes are kept locally without a push or merge.

- [ ] Configure real AI and Fish credentials and verify one complete generated, narrated chapter with the chosen voice.
