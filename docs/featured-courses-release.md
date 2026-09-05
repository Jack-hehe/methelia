# Featured project courses

The catalog contains 20 projects, each with five connected chapters. English and Traditional Chinese are authored separately: 100 chapters, 200 localized chapter packages. Enrollment prepares the authored chapters immediately and resumes the same learner-owned course when reopened. AI remains available for new extension nodes.

Seventeen reusable laboratories cover geometry, calculus, probability, collisions, orbits, circuits, synthesis, color, graphic design, animation, ecosystems, separation, flooding, economics, digital logic, pathfinding and data. Three coding courses build an interactive portfolio, a Python-generated static data website and a Python text adventure. Python executes through the existing isolated, warm Pyodide runtime; generated files can be previewed and downloaded.

The content progresses from a problem and background through a working model or program, a specific experiment, and an assessed explanation. These are simplified teaching models with explicit limits, rather than arbitrary equation solvers or production engineering tools. The Python website course produces a static website; it does not run a Flask server.

## Reuse and source material

- Course metadata: `src/core/featured/catalog.ts` (kept separate from large lesson content for the browser bundle).
- Content and factory: `src/core/featured/` and `src/core/featured-courses.ts`.
- Model, control and export contracts: [teaching-components.md](teaching-components.md).
- Twenty per-course primary/open-textbook references: `src/core/featured/references.ts`.
- [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) was consulted as a classroom/project-learning reference. No OpenMAIC code, artwork or additional visualization dependency was incorporated.

## Narration preparation

Each chapter uses one MP3 plus section cues and captions. The cache key includes the full script, page order, voice, model and language. Bundled assets live in `public/featured-audio/`; repeated learners share the prepared narration. Runtime cache misses can still synthesize with the configured ElevenLabs credentials. A cache hit does not require an API key, but voice/model configuration or a pinned speech profile is needed to identify it.

```powershell
# Read-only inventory, no synthesis:
node --import tsx --env-file=.env.local scripts/prepare-featured-audio.ts
# Generate missing assets; stops on the first API failure, does not auto-retry:
node --import tsx --env-file=.env.local scripts/prepare-featured-audio.ts --generate
# Decode every real MP3 and verify page/caption timing:
node --import tsx --env-file=.env.local scripts/verify-featured-audio.ts --require-all
```

Preparation also accepts `--course=<id>`, `--language=en`, `--language=zh-TW` and `--first-chapters`. After changing scripts or voice configuration, regenerate affected assets before release. Keep the prepared voice/model configuration consistent with Render. Never commit `.env.local`.

The release includes all 200 MP3/cue pairs (approximately 154 minutes). On 2026-09-06, `verify-featured-audio.ts --require-all` decoded all 200 real audio files with no missing assets and valid page/caption timing. Actual prepared English narration was also played in the browser while checking idle captions, navigation and persisted controls; the Chinese Python project produced a localized website preview and a valid ZIP.

## Functional verification

On 2026-09-06, the merged `main` branch passed all 294 unit tests, a production build and all 59 cases in a combined real-browser run:

- 19 featured-course cases: all 17 laboratories, catalog enrollment, saved controls, reload, demonstration takeover, exports and save conflicts.
- 5 coding cases: actual Pyodide execution, bilingual generated HTML, ZIP contents, cumulative website files, keyboard interaction and adventure replay.
- 12 existing generated-course cases: all practice environments, adaptive extensions, chapter jumps, typing demonstrations, save/stop behavior and warm Python reuse.
- 23 existing player cases: caption overlay geometry, idle controls, page-end pause, manual navigation autoplay, shared chapter audio, seek position and responsive footer behavior.

Screenshot review led to stronger diagram contrast, side-by-side synthesis controls, expandable data/truth tables, and a single consistent reset action. Browser width checks cover desktop and a 390px geometry viewport; phones may scroll the lesson surface vertically to reach detailed controls.

Release completion additionally requires the all-assets verification command, reviewed commits on `main`, a successful Render deployment and authenticated live-site checks. Those steps are recorded in the implementation plan when finished.
