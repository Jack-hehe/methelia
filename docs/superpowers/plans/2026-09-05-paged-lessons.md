# Paged Lessons Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for the isolated backend task, then integrate the coupled player locally with review.

**Goal:** Replace scrolling lessons with concise, manually paged interactive canvases and page-scoped audio.

**Architecture:** Preserve Chapter/Section protocol. Add optional pageAudio to PackageState, synthesize each script entry independently, and retain bounded legacy playback. Render one section at a time with manual navigation and native fullscreen on the whole course container.

**Tech Stack:** Next 16.3.4, React, TypeScript, SQLite, Fish SSE, Vitest, Playwright.

**Spec:** docs/superpowers/specs/2026-09-05-paged-lessons-design.md

## Global Constraints

- One Lesson Section per page; manual navigation; no autoplay on page changes.
- All page audio prepared before narrated chapter entry; retry reuses completed pages.
- Preserve existing learner workspace/progress and old content; no data deletion or secret output.
- Light default, dark supported; preview LEFT and terminal RIGHT on desktop.
- No live paid calls in automated tests; no push or history rewrite.

### Task 1: Page audio backend

**Files:** state.ts, server/worker.ts, server/service.ts, app/api/[...path]/route.ts, tests/worker.test.ts, tests/service.test.ts; optional server/page-audio.ts and tests/page-audio.test.ts.

**Interface:** `PageAudio = { status: 'pending'|'generating'|'ready'|'failed'; cues: Cue[]; captions: Caption[]; error?: string }`; `PackageState.pageAudio?: Record<string, PageAudio>`. Presence means new page-audio mode. `GET /api/audio/{packageId}?sectionId={sectionId}` retrieves that page, with the same session ownership and Range behavior. No query means legacy artifact only.

- [x] Add failing worker tests: multiple page requests contain exactly one script entry, each page timestamps start at its local time, aggregate ready only when all finish; failed/recovered job skips saved pages.
- [x] Initialize new packages with pageAudio empty object; preserve absence on legacy packages.
- [x] Synthesize script entries sequentially with existing synthesize adapter and one-entry script. Persist each artifact and metadata atomically under internal package/section key. Mark aggregate speech ready only on full completion; on failure preserve prior ready pages.
- [x] Validate page audio lookup against section IDs and retain existing ownership/Range semantics.
- [x] Verify service progress accepts valid selected page IDs and local timestamps without erasing done evidence.
- [x] Run focused tests and report changed files/results; no commit of preexisting edits.

### Task 2: Canvas player and page audio controls

**Files:** components/course-player.tsx, audio-controls.tsx, workspace-panel.tsx, lesson-section.tsx; core/lesson-pages.ts; app/globals.css; tests/lesson-pages.test.ts, browser.spec.ts.

**Interfaces:** `pageTrack(pkg, sectionId)` returns URL, ready, start/end, cues/captions for a page or legacy section. Selected page drives `AudioControls.sectionId`, workspace activeSectionId, and persisted Progress.sectionId. Absolute legacy timestamps are retained; new page timestamps are local.

- [x] Test selection bounds and legacy/page track resolution with literal expected URL/start/end.
- [x] Add browser test asserting a single visible page, next/previous and keyboard navigation, no page change from typing arrows, fullscreen entry/exit.
- [x] Replace scrolling/IntersectionObserver with explicit selected-section state. Stop and save on page changes; mount audio per package/section; leave workspace safely before navigation.
- [x] AudioControls clamps playback and seek to page bounds, stops at end and stays on same page. No automatic play except explicit play/demo action. Legacy track uses actual saved cues.
- [x] Add fullscreen control and compact right-bottom map; simplify chrome, retain header, page count and player. Workspace embeds in canvas and uses current section only.
- [x] Verify page switching, narration end, metadata races, legacy audio, per-page sources, pause and re-entry.

### Task 3: Direct teaching copy and delivery

**Files:** core/fixtures.ts, server/model.ts, README.md, CONTEXT.md, tests.

- [x] Rename vague titles to factual topics, shorten section body/narration to specific instruction, remove motivational filler and fake code from reusable teaching examples.
- [x] Update AI instructions to one concise visual page per section, brief factual titles and narration, terminal pages use workspace component templates. Avoid abstract encouragement and greetings.
- [x] Update browser regressions for page navigation, preserving map/help/workspace coverage.
- [x] Run unit suite, browser suite, typecheck, formatting and build; inspect desktop/fullscreen/mobile screenshots.
- [x] Request focused independent code review, address important findings, document behavior and legacy compatibility.
- [x] Restart only verified Methelia servers after build so the user sees the result; do not queue paid jobs automatically.
