# Guided topic-specific intake

Goal: replace the fixed five-field questionnaire with one generated question card at a time, preparing questions from the original topic and previously saved answers.

Architecture: retain the existing five learner-profile dimensions and course-generation boundary. Each question is generated on demand by a short bounded model request, validated, and persisted with its prior-answer context. A reload reuses it; editing an earlier answer invalidates dependent questions and answers. No chapters are generated until explicit completion.

User spec: one card at a time with a real analysis state, topic-specific questions AND answer options (math intuition/algorithms versus Linux tasks or other domains), polished pacing, fast preparation. Preserve unrelated user UI changes and existing progress/profile compatibility.

## Tasks and interfaces

- Backend: core/intake-question.ts exports IntakeField, intakeFields, IntakeQuestion and IntakeQuestionRecord. POST courses/:id/intake/question accepts {field, baseRevision} and returns {question: IntakeQuestion}. It reads only saved answers, checks ownership/revision/status and prerequisites, deduplicates requests, validates bounded output and caches it. Save via existing PUT/POST intake; later dependencies invalidated only for generated-question flows. Model uses at most 1200 tokens, bounded timeout and retry, existing usage limits. Unit/API tests cover caching, conflict, question validation and dependency invalidation.
- Client: learner-intake.tsx/module.css show a single question, selectable option cards and optional free text (except canonical depth values), genuine preparing/error/retry states, back/next, local draft preservation and per-step server saves. Save before requesting next question. Five small progress markers and understated transition; keyboard/reduced-motion/mobile support. No artificial wait or fake progress percent.
- Integration: deterministic local-model fixture returns different question data by topic and prior answers. Update browser intake helper and tests for sequential navigation, reload, back edits, request failure/retry, topic differentiation, and finalization. Run typecheck/build/unit tests, focused real-API browser flows, inspect desktop/mobile screenshots.

References: https://elevenlabs.io/app/sign-up and https://linear.app/signup public entry screens; authenticated onboarding is not assumed observed. https://linear.app/docs/start-guide and https://elevenlabs.io/docs/eleven-agents/customization/personalization provide public product context. Use focused cards and progressive disclosure as our own implementation choice.
