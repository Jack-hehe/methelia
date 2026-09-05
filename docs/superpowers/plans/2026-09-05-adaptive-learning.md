# Adaptive learning implementation plan

Spec: [Adaptive learning flow](../../adaptive-learning-flow.md). User approved implementation.

Architecture: preserve legacy courses; new courses persist intake before graph planning and generate only the active chapter. Optional graph extensions retain main edges and use an explicit return/workspace snapshot. Evidence and notes are source-based persisted course data; only unstarted next-node depth changes.

- [x] Add shared optional state and metadata contracts with legacy compatibility.
- [x] Test and implement intake persistence, ownership, revision conflicts and idempotent finalization; thread profile into model generation.
- [x] Implement independent intake and graph UI through bounded parallel work.
- [x] Test graph extensions, next-node selection and conservative evidence-based difficulty recommendation.
- [x] Integrate extension planning/preview/confirmation/entry/return, separate workspaces, source-based notes and personal note concurrency.
- [x] Integrate next-depth recommendation and keep-original control before next chapter generation.
- [x] Run unit/API/worker tests and isolated browser acceptance; inspect mobile/map/intake screenshots.
- [x] Review changes and rebuild/restart local preview only when no active generation is interrupted. Preserve unrelated working changes.

Verification: 142 unit/integration tests passed. Initial isolated production browser acceptance passed 15 cases; after review fixes, 9 affected cases passed (19 distinct browser cases across both runs). Both production builds passed. Read-only review confirmed unsaved-intake recovery and cross-route review isolation fixes. Runtime restarted only after active generation jobs drained; localhost:3000 health returned ok. AI and speech assertions use local doubles; no new paid verification generation was requested.
