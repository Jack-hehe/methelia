# Guided practice follow-up

User-approved direction: Learning Map belongs at the bottom right; practice is a full split workspace (live website on the left, terminal on the right). Demonstrate once with a guide cursor, then let the learner try. Preserve one complete narration recording per chapter.

- Add a validated optional guide edit to demonstration sections; replay from prepared starter files and the existing narration clock. Never change learner files during demonstrations.
- Replace the side panel with a two-column practice workspace. `edit filename` opens a terminal-native editor; changes immediately update the preview and are persisted when leaving the editor. This is explicitly an educational terminal, not an OS shell.
- Offer a manual step-through when narration is unavailable, clearly labeled without synthetic timings or fake speech. With prepared audio, use its real section cues for guide playback.
- Improve demo narration and practical examples; keep saved chapter packages immutable.
- Verify protocol, browser layout, independent demonstration state, editing persistence, map position, and regressions. Test live Fish only if configured; never print credentials.

## Implementation notes

Implemented the prepared guide projection, optional safe preview click, full split workspace, immediate draft preview, save-before-navigation, package-scoped playback requests and metadata-ready seeking. Practice narration reaches the end of its instructions before the checkpoint blocks further playback. Completed Fish responses with invalid alignment no longer trigger repeated paid synthesis attempts.

Independent review found draft loss during SPA navigation, stale playback requests on chapter changes, and a missing JavaScript demonstration click; all three were addressed. Existing saved chapter packages remain immutable.

Live Fish synthesis remains unverified: the current project environment has no API key or reference ID. Only presence was inspected; no credentials were printed. Browser tests use an explicitly test-only silent WAV. Concurrent landing/theme changes and staged work from another session are preserved; no branch/index operations are performed by this follow-up.
