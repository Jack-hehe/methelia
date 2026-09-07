# Methelia

**English** | [繁體中文](README.zh-TW.md) · [Website](https://methelia.com)

**Learn anything you want.** Methelia is an AI learning platform built around a familiar problem: receiving plenty of information does not mean understanding it. AI can produce pages of answers, but learners still need a clear path through the ideas, examples that make them concrete, and opportunities to put their understanding to work.

Describe what you want to learn. Methelia asks topic-specific questions about your background and goals, then organizes a course around a Learning Map. Lessons combine focused teacher narration with text, diagrams, animations, interactive models and hands-on practice where each helps explain the subject. Some ideas need a clear visual explanation; others become understandable through an experiment, a question or a complete project. Every activity should serve the learning goal.

Our vision is a learning environment that works across subjects, whether you want to understand a mathematical idea, explore a scientific phenomenon or learn the full process of building something. The Learning Map tracks your progress, supports deeper branches and helps adapt later chapters to your learning. The aim is to help you understand the essentials, connect them and apply them. The current implementation uses the supported components and practice environments listed below.

Methelia is an open-source project under active development. The current application uses anonymous browser sessions: courses and saved work live on the server, and a browser cookie identifies each learner. You can run the project locally or deploy your own instance. The hosted instance may be paused; local setup does not depend on its availability.

## Core features

- Topic-specific onboarding connects your background and learning goal to a personalized course and Learning Map, with later chapters adjusted from checkpoint results and optional branches for deeper exploration.
- Focused explanations, diagrams, animations, interactive models and practice share one learning interface; the format follows the concept being taught.
- 20 featured project courses, five chapters each, in English and Traditional Chinese, with all 200 chapter narrations prepared in advance.
- 17 reusable interactive laboratories across mathematics, physics, chemistry, biology, economics and logic.
- A Python runtime and a web editor with sandboxed preview, both in the browser; finished work downloads as a ZIP.
- Checkpoints assess understanding through questions or verify saved work and code in supported practice environments.

## Technology

| Category         | Technology or service                                          | Purpose                                                  |
| ---------------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| AI model         | Configurable OpenAI-compatible model API, including OpenRouter | Generates course graphs, chapter content and checkpoints |
| Speech           | **ElevenLabs** (`eleven_v3`, with-timestamps)                  | Narration, plus caption and page-boundary alignment      |
| Frontend         | Next.js 16 App Router, React 19, TypeScript 7, Lucide icons    | Player, Learning Map and laboratory interfaces           |
| Backend          | Node.js 22, Zod 4, built-in `node:sqlite` in WAL mode          | API, content validation, job queue and persistence       |
| Learner runtimes | Pyodide 0.28.3, sandboxed iframe preview, fflate               | In-browser Python, web workspace and ZIP export          |
| Hosting          | Render web service with a persistent disk                      | Website and background worker on one instance            |
| Verification     | Vitest, Playwright                                             | Unit tests and browser flow tests                        |

[render.yaml](render.yaml) configures a single Render service using `main`. Automatic deployment is disabled in this configuration: pushing a commit alone does not publish it; trigger a manual deployment in Render. See [operations](docs/operations.md) for setup, backups and usage limits. The model is selected through `AI_MODEL`, rather than hard-coded to a particular provider model.

## Run locally

Use **Node.js 22.17 or newer**. Node 22 may print an experimental warning for its built-in SQLite module.

```bash
git clone https://github.com/Jack-hehe/methelia.git
cd methelia
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). On PowerShell, use `Copy-Item .env.example .env.local`; use `npm.cmd` if execution policy blocks `npm.ps1`.

**Featured course content and the starter lesson work without provider API keys.** For personalized generation, set `AI_BASE_URL`, `AI_MODEL` and `AI_API_KEY` in `.env.local`. Use an OpenAI-compatible endpoint such as OpenRouter's `https://openrouter.ai/api/v1` and a model supporting the structured output expected by the application.

For new narration, set `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` and `ELEVENLABS_MODEL`. The example environment defaults to `eleven_flash_v2_5`; deployed starter and featured assets use `eleven_v3`. A bundled audio cache hit requires the matching voice/model/language profile, but no synthesis key. Changing that profile requires preparing new audio. Configure these values for your own instance.

```bash
# Production application, locally
npm run build
npm start
```

Data defaults to `.data/`; `METHELIA_DATA_DIR` overrides it. Python initialization and Google Fonts require network access. Keep credentials in `.env.local`, which is ignored by Git.

## Architecture

The model selects supported components and supplies structured course content, examples and checkpoint conditions. React components implement the learning interface. Generated website examples can contain HTML, CSS and JavaScript, but run in the preview sandbox rather than becoming application UI code.

```mermaid
flowchart TB
    learner["Browser: player, Learning Map, laboratories"]
    runtime["Sandboxed preview and Pyodide worker"]
    api["Next.js API: sessions, ownership and origin checks"]
    service["LearningService: courses, progress, workspaces and branches"]
    catalog["Authored courses and bundled narration"]
    db[("SQLite: courses, work, audio and generation jobs")]
    worker["Background worker: content, prefetch and speech"]
    model["Configured AI provider"]
    validator["Zod and semantic validation"]
    speech["ElevenLabs with-timestamps"]
    learner --> api --> service --> db
    learner --> runtime
    catalog --> service
    worker <--> db
    worker --> model --> validator --> db
    worker --> speech --> db
```

Next.js and a background worker run together through `concurrently -k`, sharing SQLite in WAL mode. Graph, chapter and narration jobs are persisted in the database. Content, prefetch and speech work are scheduled separately. Intake questions and some assistance requests call the model through API handlers, so those interactions still depend on provider latency.

Generated packages pass schema and semantic validation before use. Graphs, prerequisites, component parameters and declared checkpoints are checked; invalid model output can receive up to two repair attempts. Worker writes recheck that the course and package are still current. Provider failures are surfaced for retry; interrupted external requests can have uncertain billing outcomes.

## Project Structure

```text
methelia/
├── src/
│   ├── app/                         # Next.js pages, layouts and API routes
│   │   ├── api/[...path]/route.ts   # Course, session, progress and workspace API
│   │   ├── api/health/route.ts      # Deployment health check
│   │   └── explore/page.tsx         # Course catalog page
│   ├── components/                  # Player, Learning Map, intake and workspaces
│   │   └── labs/                    # Reusable interactive learning laboratories
│   ├── core/                        # Course schemas, state and learning logic
│   │   ├── featured/                # Authored featured courses and references
│   │   ├── labs/                    # Simulation models and experiment logic
│   │   └── starter-teaching.ts      # Bilingual starter teaching copy and scripts
│   ├── server/                      # Persistence, providers and orchestration
│   │   ├── service.ts               # Course lifecycle, progress and workspaces
│   │   ├── worker.ts                # Background content and speech jobs
│   │   ├── db.ts                    # SQLite schema and storage
│   │   └── speech.ts                # ElevenLabs synthesis and alignment validation
│   └── proxy.ts                     # Optional private access gate
├── public/
│   ├── featured-audio/              # Prepared featured MP3s and caption/page timing
│   └── starter-audio/               # Prepared starter MP3s and caption/page timing
├── scripts/                         # Prepare, inspect and verify narration assets
├── tests/                           # Vitest unit tests and Playwright browser tests
│   └── fixtures/                    # Test courses, provider substitutes and servers
├── docs/                            # Teaching contracts, operations and release records
│   └── course-scripts/              # Reviewed starter narration in both languages
├── .env.example                     # Local environment configuration template
├── next.config.ts                   # Next.js build configuration
├── render.yaml                      # Render service, disk and environment settings
└── package.json                     # Dependencies and development commands
```

To change starter teaching content, begin with [starter-teaching.ts](src/core/starter-teaching.ts) and its [reviewed scripts](docs/course-scripts). Learning components live in [src/components/labs](src/components/labs), with their model logic in [src/core/labs](src/core/labs). Local runtime data in `.data/` and build output in `.next/` are generated and ignored by Git.

## Verify changes

```bash
npm test
npm run build
npx playwright install chromium
```

For isolated browser acceptance tests, first build the dedicated output:

```bash
# macOS / Linux
METHELIA_TEST_BUILD=1 npm run build
npx playwright test --config playwright.general.config.ts
```

```powershell
# PowerShell
$env:METHELIA_TEST_BUILD = '1'
npm run build
Remove-Item Env:METHELIA_TEST_BUILD
npx playwright test --config playwright.general.config.ts
```

This configuration uses a temporary database, a deterministic local model substitute and port 3100. It exercises the real API, worker and browser runtime. The default `npm run test:e2e` instead starts or reuses the development server on port 3000; some isolated-server cases are skipped there.

Dated verification records, including the narration preparation commands, live in the [featured release notes](docs/featured-courses-release.md) and the [starter release notes](docs/starter-course-release.md). Preparing new narration can consume provider credits.

## Limitations and future work

- There is no account system. Clearing the learner cookie removes access to that browser's saved courses; it does not itself delete their server records. Cross-device sign-in and recovery are not implemented.
- Featured courses have five chapters each. Personalized courses have variable Learning Maps (the current prompt usually requests 4–9 nodes), with optional extensions. Supported course languages are English and Traditional Chinese; catalog search and additional languages remain future work.
- A course is either written by us or generated from a goal you type. We want to build one from your own material too — a video, a PDF or a slide deck.
- Checkpoints are multiple-choice questions and file checks. They cannot tell whether code is written well, or whether an explanation in your own words makes sense; written answers with model feedback are planned.
- Teacher-authored courses, classroom roles and assignments do not exist yet.
- The terminal runs a bounded command set rather than a host shell, Python runs in the browser, and the laboratories expose fixed parameters rather than solving arbitrary equations.
- The checked-in deployment uses one `1c-2g` Render instance and a 1 GB persistent disk for SQLite, including generated audio. This is not an automatically scaling architecture; attached disks prevent scaling a service to multiple instances. See [Render's disk limitations](https://render.com/docs/disks#disk-limitations-and-considerations).
- AI and narration use paid external services. The deployment template currently sets application daily budgets to `unlimited`; configure budgets for your own deployment. Provider quotas still apply. See [operations](docs/operations.md) for limits, usage accounting and backups.
- One worker runs separate foreground-content, prefetch and speech lanes, processing one job per lane at a time. Simultaneous generation requests queue up. Provider quotas, CPU, memory, storage and bandwidth still constrain capacity; paying for hosting does not remove them. No concurrent-user capacity has been established by load testing.

## Contributing

Contributions to the learning experience, course content, interactive components and reliability are welcome. For a substantial change, open an issue first to describe the problem and proposed approach.

- Keep lessons focused on understanding: explain an idea, make it concrete, then give the learner a useful way to apply it.
- Choose text, visuals or interaction to suit the subject. Keep interfaces readable and give learning content room to breathe.
- Make components reusable across courses, with explicit parameters and matching validation.
- Keep English and Traditional Chinese documentation and learner-facing copy aligned.
- Include relevant verification with your changes. Never commit API keys or learner data.

## Sources and attribution

- Authored featured courses and simplified models live in [src/core/featured](src/core/featured) and [src/core/labs](src/core/labs). Their [references](src/core/featured/references.ts) point to primary documentation and open textbooks. Personalized course content is generated at runtime.
- ElevenLabs supplies synthesized narration; OpenRouter provides the configured model gateway. Provider terms apply to their services and generated outputs.
- Pyodide assets are fetched from jsDelivr. DM Sans and Noto Sans TC are loaded through Google Fonts with system fallbacks; they are not bundled font files.
- Dependencies retain their own licenses. The repository's MIT license does not replace third-party licenses or service terms.

## Team and license

Built by **Jack** and **Casanova**. Repository code is licensed under [MIT](LICENSE).
