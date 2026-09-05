# Methelia Learning

Methelia is an AI-native learning environment that generates structured courses across subjects and presents them through narrated, interactive web experiences. Subject coverage and available practice tools are distinct.

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
The current narrated position within the selected Lesson Section, synchronizing subtitles, playback progress, and guided interaction without changing pages.
_Avoid_: Video timestamp, page position

**Page Audio Track**:
The complete narration for one Lesson Section, with its own subtitles and timing. All Page Audio Tracks in a Chapter Package are prepared before narrated learning begins.
_Avoid_: Sentence audio, teacher video, chapter-wide playback

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
A temporary path added to address a prerequisite gap or learner-requested topic before returning to the main course.
_Avoid_: Side course, optional playlist

**Rejoin Point**:
The named Learning Node where a Learning Branch reconnects to the main Course Graph.
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
