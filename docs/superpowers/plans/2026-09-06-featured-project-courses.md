# Featured Project Courses Implementation Plan

> Execution: superpowers:subagent-driven-development; user approved immediate implementation.

Goal: Ship 20 bilingual, project-based courses through the existing player, with reusable interactive laboratories and persisted learner work.

Architecture: Extend the trusted chapter component registry with lab.experiment. Curated graph/chapter factories use the existing Course, PackageState, navigation, narration and session ownership. Domain calculations remain pure; renderers receive state and report changes through a shared interface.

Spec: ../specs/2026-09-06-featured-project-courses-design.md

Constraints: Preserve existing user edits. Large open stage, 20–22px reading text, independent subtitle overlay. English and Traditional Chinese. No fake backend execution. No automatic generation of all course audio at visitor entry.

## Interfaces

`LabKind`: geometry, calculus, probability, collision, orbit, circuit, sound, color, design, animation, ecosystem, separation, flood, economy, logic, pathfinding, data.

`LabProps`: `{kind: LabKind; language: 'en'|'zh-TW'; value: Record<string,number>; onChange: (next:Record<string,number>)=>void}`.

Chapter component: `{type:'lab.experiment',kind:LabKind,mission:string,initial?:Record<string,number>}`. Trusted renderers never evaluate generated JavaScript.

Curated factory: `featuredCourses` metadata `{id, title:{en,zh}, description:{en,zh}, domain:{en,zh}, kind:LabKind|'web'|'python', chapters:number}`; `featuredGraph(id,language):Graph`; `featuredChapter(id,node,language):Chapter`.

## Tasks

- [x] Domain laboratories: src/components/labs/science-labs.tsx, src/core/labs/science.ts, tests/lab-science.test.ts. Geometry 2D/3D, calculus, probability, collision, orbit, circuit, sound, color. Verify sphere slices, conservation, probability and circuit equations before visual implementation.
- [x] Project laboratories: src/components/labs/project-labs.tsx, src/core/labs/projects.ts, tests/lab-projects.test.ts. Design, animation, ecosystem, separation, flood, economy, logic, pathfinding, data. Verify BFS, truth tables, water balance and cost calculations before visual implementation.
- [x] Bilingual course content: src/core/featured-courses.ts and src/core/featured/*.ts. Write distinct 5–7 chapter paths with meaningful topic-specific narrative, experiments, assessments and scripts; validate every chapter in both languages.
- [x] Core integration: src/core/lab.ts, protocol.ts, capabilities.ts, state.ts, server/service.ts, app/api/[...path]/route.ts. Curated creation remains idempotent and session-owned. Persist experiment state by node and section with bounded finite values. Reject unknown course IDs, sections and keys. Test ownership and non-overwrite on reopen.
- [x] Player and catalog: Lab renderer wrapper, responsive labs.css, LessonSection integration, working CourseCatalog. Open curated course with stable request IDs, avoid duplicate clicks, list actual metadata and domain filters in Explore. Test click-to-player and reload persistence.
- [x] Python generated-file bridge: bounded output files from existing isolated Pyodide worker, safe generated HTML preview and artifact download. Tests reject oversized output and unsafe paths. Course prose explicitly describes static site generation.
- [ ] Quality and release: unit tests, production build and real browser interactions; per-course content audit, narration asset preparation and caching; retain licenses. Stage only reviewed changes, grouped commits, reconcile main, point Render to verified revision, deploy, verify HTTPS and protected website. Do not claim completed audio or online deployment before evidence.

## Execution ledger

- Baseline contains uncommitted user edits to learning-map.tsx, state.ts, service.ts, worker.ts and generated next-env.d.ts. Preserve and integrate; do not reset.
- Ruling: work in current checkout to retain user edits and local preview; scoped files and commits avoid discarding ongoing work.
- Implemented the 17 science/project renderers with pure-model tests; cross-review corrected a bypassed resistor drawing, logic wire state, maze preset resets and floor-contact squash.
- Implemented isolated Python generated text artifacts, safe preview and ZIP download; 23 relevant runtime/boundary tests passed.
- Implemented featured enrollment and versioned lab persistence, draft recovery and content-addressed narration cache. All 200 localized chapter packages validate; the merged main branch passed 294 unit tests, a production build and a combined 59-case browser run covering featured projects and existing learning/player flows.
- Ruling: curated enrollment uses live course mode with a featuredId; bundled nodes are immediate, while future extension nodes can use the normal generation pipeline. Opening a curated course does not require AI configuration.
- Ruling: retain the known Python sandbox; the Python website project generates a static site. Actual Flask/Django hosting is outside this release.
- Review fixes: prevent demonstration parameters from leaking into learner work, recover stale-tab saves through an explicit latest-version reload, correct registered A/B dataset semantics, and resolve narration cache identity without demanding synthesis credentials.
- Screenshot review: open lesson stage, readable diagram contrast, side-by-side sound controls, expandable data/truth tables, one reset action. Python output bridge committed as 05dcf1f.
- Narration generation is running for all 200 localized chapters. Initial 50 assets decoded successfully with valid page/caption timing; final all-assets verification and deployment remain pending.
