# Starter website course — 2026-09-06

The revised starter teaches learners to build an interactive personal homepage with HTML, CSS and JavaScript. It contains five chapters and 19 pages per language. This release does not change the 20 featured courses.

## Approved narration

The user reviewed and approved both scripts before synthesis:

- [繁體中文講稿](course-scripts/starter-website-zh-TW.md)
- [English script](course-scripts/starter-website-en.md)

Ten complete chapter MP3s and their page/caption metadata are bundled in `public/starter-audio`, approximately 33 minutes across both languages. Assets are keyed by the exact script and voice/model/language profile. Production uses the existing ElevenLabs voice and `eleven_v3`, with Chinese or English language codes. No automatic synthesis is scheduled if starter audio is missing; cached playback does not require a synthesis key.

The initial long responses exposed a base64-regex stack overflow. The parser now checks a flat character class and padding length, covered by a four-megabyte regression test. Both affected audio files were recovered without resynthesis; all ten files passed decoding and timing verification.

## Verification

- Production build and TypeScript compilation passed.
- 87 focused unit tests passed: speech validation, cache behavior, chapter schema, language, page mapping, handouts, preview, course progression and narration migration.
- 28 selected existing browser cases passed, with outdated title expectations updated and rerun. These cover saved edits, demonstration isolation, playback, page navigation, practice gates, Learning Map, review and mobile layout. Text-only cases use a separate server with an uncached voice profile.
- Two new bilingual browser cases verify h1, p and button controls on the guided page, corresponding preview highlights, and unchanged learner files.
- Real Chinese and English first-chapter MP3s played in Chromium, paused at page boundaries and resumed automatically on Next page, without page errors.
- All ten MP3s decoded successfully; all page cues and captions refer to valid sections and fit within their audio durations.

## Reproduce

Configure the matching voice/model in `.env.local`. These checks do not request new speech:

```powershell
node --import tsx --env-file=.env.local scripts/prepare-starter-audio.ts
node --import tsx --env-file=.env.local scripts/verify-starter-audio.ts --require-all
```

After reviewing any changed scripts, `--generate` on the preparation command creates only missing assets and stops on the first error without retrying. This can consume provider credits. Preparation refuses script paragraphs that differ from the review documents.

Existing saved courses retain their original content. Start a new course through “Try a lesson” to use the revised edition. The course exports a static website; its teaching-terminal preview command does not start a real Python server or publish the learner's site.
