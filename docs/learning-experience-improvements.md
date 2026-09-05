# Learning experience improvements — 2026-09-05

Course delivery now separates foreground content from speculative next-chapter preparation. One foreground lane, one prefetch lane and one speech lane share the durable job queue; a blocked prefetch cannot occupy the foreground lane. Model repairs include the rejected response instead of starting from error text alone. Graph requests omit detailed component descriptions, and chapters omit irrelevant workspace file types and graph metadata. Provider response time remains variable; no live-model speedup percentage is claimed.

Python retains its sandboxed worker after successful runs. Each run replaces practice files, clears imported practice modules, and restores standard streams, builtins, search paths, arguments and environment. Errors, Stop and timeouts discard the worker. The initial CDN/runtime load still takes time. This is a classroom interpreter, not a fully reset OS or arbitrary package environment. Execution saves the current draft first, cancellation also applies while saving, and output stays bounded to 20,000 characters / 10 seconds.

New Python exercises can provide a target stdout. Feedback identifies the first differing line, preserving meaningful whitespace. Saved-file checkpoints separately show the target and the actual saved content; they do not claim to validate stdout or accept every semantically equivalent solution.

New chapters can use `lesson.article`: reading paragraphs, a takeaway, and an optional illustrated process. Explanatory concept cards display their complete text without requiring clicks. Process figures animate their appearance and respect reduced-motion preferences. These are structured illustrations, not externally generated photographs or videos. Existing prepared course content is not regenerated automatically.

Teacher demonstrations progressively type the replacement, show a caret and visible pointer, and run on a manual clock when narration is unavailable. Demonstration files remain separate from learner files. Python execution remains an explicit learner action.

ElevenLabs Flash v2.5 is the new default. Course languages map to ISO 639-1 `zh` or `en`, pinned with the model and voice for retry consistency. Previously pinned Multilingual v2 remains compatible and does not receive an unsupported parameter. Existing audio must be rebuilt to change its pronunciation. Language selection does not guarantee a Taiwanese accent: voice selection still matters. No paid speech requests were used for automated verification.

Primary references consulted:

- [ElevenLabs timed speech endpoint](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps): `language_code` enforces language, but Multilingual v2 does not support it.
- [ElevenLabs models](https://elevenlabs.io/docs/overview/models): Flash v2.5 supports Chinese and prioritizes low latency. Published model latency is not full course audio preparation time.
- [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC): reference for distinguishing presentation material, demonstrations and interactive exercises; no external project code was executed or copied.

Validation uses a separate `.next-validation` build (`METHELIA_TEST_BUILD=1`), local AI/speech doubles, isolated SQLite data, and the real browser Pyodide runtime. One observed warm execution, including save and UI updates, took 126 ms. This is a local observation, not a service-level guarantee.

Verification: 115 unit/integration tests passed; after final changes, the 15 affected unit/integration tests passed again. Five general-course browser cases and four lesson-experience cases passed, covering warm execution, stream reset, stop/timeout/output limits, cancellation during saving, all four environments, responsive reading/illustration, failed-check evidence, and visible manual teaching without changing learner files. TypeScript and both production builds passed. The broad browser suite was interrupted after two legacy tests failed because concurrently changed UI removed the global workspace entry; those unrelated UI changes were preserved. The complete legacy browser suite is not claimed as passing.
