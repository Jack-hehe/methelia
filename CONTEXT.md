# Methelia Learning

Methelia is an AI-native learning environment that generates structured courses across subjects and presents them through narrated, interactive web experiences. Subject coverage and available practice tools are distinct.

The product's core is helping learners understand and apply essential ideas through purposeful combinations of concise explanations, visuals, animations, challenges and practice. Authoring starts with a target ability and evidence of understanding, then chooses teaching activities and supported capabilities. Page count, text volume and clicks are not evidence of mastery. See [Learning experience principles](docs/learning-experience-principles.md) for the user's intended direction and an explicit distinction between existing and proposed capabilities.

New live courses now start with five intake questions and persist a learner profile before planning. They generate only the active chapter, suggest conservative next-node depth changes from recorded checkpoint attempts, preserve the main route when adding optional extensions, and keep source-based notes plus revisioned personal notes. Extension workspaces and main-route return state are separate; review edits use isolated copies. Legacy courses retain their prepared content and prefetch behavior. See [Adaptive learning flow](docs/adaptive-learning-flow.md) for the implemented boundaries and further product direction.

Python courses eagerly initialize one sandboxed interpreter owned by the course UI, not individual workspace views. Page changes preserve that interpreter and scoped results; submitted jobs can finish after the view closes. Stop/timeouts discard and prewarm a fresh worker. Learner code still runs only on an explicit Run action. Exiting the course UI disposes the session.

## Language

**Learning Goal**:
The learner's intended knowledge or ability, with the starting level and desired outcome needed to plan a course. It is not a choice of a predefined course or a particular teaching tool.
_Avoid_: Course selection, component request

**Generation Policy**:
The shared rules that bound course size, chapter size, preparation, and teaching quality while allowing the plan to adapt to a Learning Goal.
_Avoid_: Fixed curriculum, hardcoded chapter count

**Learning Capability**:
A supported way to explain, demonstrate, practice, or assess knowledge. The subject a learner requests does not by itself establish that every practical capability needed to teach it is available.
_Avoid_: Supported subject, unlimited tool access

**Learning Environment**:
The practical setting in which a learner performs an activity and observes its results, such as a website preview or a Python exercise environment. A Terminal is one possible interface to an environment, not the environment itself.
_Avoid_: Terminal, lesson layout

**Course Graph**:
The authoritative structure of a generated course, including learning dependencies, progress, and branches.
_Avoid_: Course outline, playlist

**Learning Map**:
The learner-facing visual representation of the Course Graph.
_Avoid_: Course Graph UI, roadmap widget

**Learning Node**:
A mastery unit with one clear learning objective, delivered through one Chapter Package containing several Lesson Sections and interactions.
_Avoid_: Page, slide, video

**Course Player**:
The learning surface that presents one interactive Lesson Section at a time, with narration, subtitles, manual page navigation, and an optional fullscreen view.
_Avoid_: Video player, slide viewer

**Lesson Section**:
One focused explanation, demonstration, practice, or knowledge check inside a Lesson Document, presented as a single interactive page.
_Avoid_: Scene, slide, video clip

**Chapter Script**:
The complete ordered narration for one Chapter Package, with references to Lesson Sections, interaction cues, and practice checkpoints.
_Avoid_: Scene Script, video script, sentence stream

**Learning Component**:
A stable, reusable interactive surface such as a Terminal, Code Editor, Browser Preview, explainer, or quiz.
_Avoid_: AI-generated widget, slide template

**Lesson Document**:
The ordered collection of interactive Lesson Sections generated for one Learning Node.
_Avoid_: Video, slide deck, article

**Chapter Package**:
The complete generated delivery unit for one Learning Node, containing its entire Lesson Document, narration script, interaction definitions, cue anchors, and completion rules. It is generated as a whole before playback and remains structurally immutable while active.
_Avoid_: Sentence stream, partial page generation

**Narration Cursor**:
The absolute time within a whole-chapter audio track. Playback pauses at the selected Lesson Section's end and retains the page for practice. Manual timeline navigation selects a paused page; explicit page/chapter navigation requests autoplay. Idle playback chrome hides after 2.5 seconds and restores on activity or pause.
_Avoid_: Video timestamp, page position

**Chapter Audio Track**:
One audio artifact generated from the complete ordered chapter script in a single synthesis request, with absolute per-section cues and captions. Existing page audio remains a legacy read format; new or rebuilt packages use whole-chapter narration. See [Chapter narration](docs/chapter-narration.md).
_Avoid_: Sentence audio, teacher video, one request per page

**Course Planner**:
The service that turns a learner's goal into a complete Course Graph without generating detailed Lesson Sections.
_Avoid_: Course generator

**Node Generator**:
The service that turns one Learning Node into a complete, validated Chapter Package shortly before the learner reaches it.
_Avoid_: Page generator, video generator

**Component Template**:
An allowlisted, tested presentation and interaction pattern that composes one or more Learning Components into a Lesson Section.
_Avoid_: AI-generated HTML, course template

**Protocol Validator**:
The boundary that accepts only supported Chapter Packages, component inputs, actions, and completion conditions before a learner begins a chapter.
_Avoid_: Content filter

**Completion Event**:
Evidence emitted by a Learning Component that a Lesson Section's learning requirement has been satisfied.
_Avoid_: Button click, page completion

**Learning Branch**:
An optional extension from a selected anchor node to address a prerequisite gap or learner-requested topic. Its internal chain does not replace main-route edges; entering it saves the main learning position and workspace for return.
_Avoid_: Side course, optional playlist

**Rejoin Point**:
For legacy linear branches, the named node where the branch reconnects. New extensions instead save an explicit return position when entered; this can differ from the anchor and includes the main workspace and saved page progress.
_Avoid_: Return page, redirect

**Graph Revision**:
An immutable version of a Course Graph created after an approved structural change. Completed nodes remain part of its history even when the future route changes.
_Avoid_: Graph overwrite, course reset

**Branch Preview**:
A proposed Learning Branch showing its objectives, prerequisites, cost, and Rejoin Point before it becomes part of a Graph Revision.
_Avoid_: Automatic reroute

**Help Drawer**:
A separate conversational surface for questions about the active chapter. It pauses the narration without modifying the active Chapter Package.
_Avoid_: Clarification Section, lesson rewrite

**Support Node**:
A learner-approved Learning Node added to strengthen a specific missing concept before the learner continues along the main route.
_Avoid_: Chat answer, inserted section

**Node Recommendation**:
A proposal shown in the Help Drawer for one or more Support Nodes, including why they help and where they would rejoin the Course Graph.
_Avoid_: Automatic node creation

**Speaker Avatar**:
A compact circular presentation of supplied character artwork that indicates who is speaking alongside narration and subtitles.
_Avoid_: Teacher video, talking head

**Learner Session**:
An anonymous persisted learning journey containing one learner's Course Graph, active Chapter Package, progress, and workspace state without requiring an account.
_Avoid_: User account, guest account

**Learning Workspace**:
The persistent learner-owned working materials shared by the Learning Components used in a practical activity. A conceptual lesson need not have a Learning Workspace.
_Avoid_: Shell session, temporary code snippet
