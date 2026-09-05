# Paged interactive lessons

Approved in conversation: one Lesson Section per page; manual previous/next arrows exposed at canvas edges; keyboard arrows outside editable controls; ordinary embedded canvas with an explicit bottom-right fullscreen control and Escape exit. Page audio ends in place and never automatically advances or autoplays on navigation. Content is concise, factual, action-oriented Traditional Chinese. Terminal/code practice is primarily left live preview and right terminal, not stacked explanation cards.

Course Graph nodes remain whole small chapters. Every chapter's sections and per-page audio are prepared before narrated entry. One Fish request per script entry; independently persisted audio/captions with zero-based local timestamps. Retry reuses ready pages. Legacy packages remain readable: an existing whole-chapter track is bounded to the selected section's cues, never overwritten merely by viewing. New packages use page audio. Existing learner workspace/progress and old content remain intact; updated demo content appears in newly created courses.

Player uses one visible selected section and saves its ID plus audio time. Page selection stops audio, saves any dirty workspace, and preserves validation gates on chapter advancement. Help and Learning Map pause narration; map is opaque and works inside browser fullscreen. Native fullscreen failure leaves the embedded canvas usable with an error. Light default and dark theme remain.

No new image assets, arbitrary AI-generated interface code, real shell, or live paid synthesis for automated tests. Keep credentials and existing local data private. Do not push or rewrite Git history for this change.
