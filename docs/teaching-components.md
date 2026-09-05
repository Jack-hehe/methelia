# Reusable teaching laboratories

This guide describes the implemented `lab.experiment` component. The source of truth for accepted kinds and parameter bounds is [`src/core/lab.ts`](../src/core/lab.ts). Calculations live in [`science.ts`](../src/core/labs/science.ts) and [`projects.ts`](../src/core/labs/projects.ts); React renderers live in [`src/components/labs`](../src/components/labs).

## Authoring interface

```ts
type LabProps = {
  kind: LabKind;
  language: "en" | "zh-TW";
  value: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
};

// A chapter section's component:
const component = {
  type: "lab.experiment",
  kind: "flood",
  mission: "Set rainfall to 60 mm. Compare 30% and 80% permeable ground.",
  initial: { rain: 60, green: 30, storage: 10 },
};
```

The strict component schema accepts only `type`, `kind`, `mission`, and optional `initial`. A mission is 1–800 characters. It does not currently have a component-version field or accept executable code. Unknown kinds, unknown parameter keys, and out-of-range initial values fail validation; authors must repair the content rather than substitute a different component.

Parameter records contain at most 128 entries. Keys begin with a letter, contain only letters, digits or underscores, and are at most 40 characters. Values must be finite numbers in the general range −1,000,000 to 1,000,000 **and** the narrower kind-specific ranges below. Omitted parameters use renderer defaults. `onChange` supplies the complete next parameter record, not a patch; preserve other learner settings when changing one control.

Boolean controls use `0` and `1`. Select controls and counts should use the integer choices described below. The shared numeric validator checks ranges, not integer steps; do not author fractional select values. The interface language and the mission language must agree. Curated lesson authoring stores English and Traditional Chinese copy in `Bilingual` values and selects one language when creating the chapter; the lab schema itself contains one localized mission string.

## Parameter reference

All intervals are inclusive. Names are case-sensitive. These ranges are transcribed from `labParameterRanges`; update this guide when changing that registry.

| Kind          | Accepted parameters and ranges                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `geometry`    | `radius` 1–5; `slice` −5–5; `rotation` 0–360 degrees                                                                           |
| `calculus`    | `bend` −2–2; `join` −2–2; `x` −3–3                                                                                             |
| `probability` | `probability` 0–1; `reward` 0–20; `cost` 0–10; `trials` 10–1000; `seed` 1–999                                                  |
| `collision`   | `mass1`, `mass2` 1–5 kg; `velocity1` 0–6; `velocity2` −6–0 m/s; `restitution` 0–1                                              |
| `orbit`       | `radius` 1.2–3; `speed` 0.2–1.7 **times the local circular speed**                                                             |
| `circuit`     | `voltage` 0–12 V; `resistance` 10–1000 Ω; `parallel` 0–1                                                                       |
| `sound`       | `frequency` 110–880 Hz; `amplitude` 0–1; `waveform` 0–2; `attack` 0.01–1 s; `release` 0.05–2 s; `note1`–`note4` 0–12 semitones |
| `color`       | `red`, `green`, `blue` 0–255                                                                                                   |
| `design`      | `titleSize` 24–64; `spacing` 16–60; `hue` 0–360; `columns` 1–3; `format` 0–1                                                   |
| `animation`   | `duration` 0.5–4 s; `height` 30–220; `squash` 0–60%; `easing` 0–1                                                              |
| `ecosystem`   | `prey` 0–100; `predators` 0–30; `capacity` 20–200; `growth` 0.1–1.5                                                            |
| `separation`  | `filter`, `evaporate` 0–1                                                                                                      |
| `flood`       | `rain` 0–120 mm; `green` 0–100%; `storage` 0–50 mm over the block                                                              |
| `economy`     | `price` 1–10; `stock` 0–200; `traffic` 20–180; `cost` 0.5–5; `fixed` 0–200                                                     |
| `logic`       | `a`, `b`, `c`, `gate` 0–1                                                                                                      |
| `pathfinding` | `maze` 0–1; `wall0`–`wall63` 0–1                                                                                               |
| `data`        | `clean`, `chart`, `group` 0–1                                                                                                  |

The pathfinding renderer reserves cells 0 and 63 as start and destination; it ignores wall flags for those two cells even though the registry accepts the keys. Author editable walls only for cells 1–62.

## Eight science stages

| Kind          | Observable behavior and useful challenge                                                                                                                                   | Model boundaries                                                                                                                                                                                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `geometry`    | Rotatable orthographic sphere and circular section. At radius 5 and slice 3, section radius is 4. Rotation changes the view only.                                          | The renderer uses **y = slice** and the section equation **x² + z² = r² − y²**. An outside plane has no intersection; the radius helper returns zero. No editable point plotting or labeled 2D coordinate grid is provided.                                                              |
| `calculus`    | Inspect a point and tangent on a joined curve. Set `join=0` to remove the slope jump.                                                                                      | Left curve is **y = bend × x² / 3**; right curve adds **join × x**. Slope is `2 × bend × x / 3`, plus `join` on the right. At x=0 the displayed slope is the right derivative. This is a shape check, not a ride-safety or force simulation.                                             |
| `probability` | Compare seeded cumulative net rewards against expected value; a fair configuration satisfies `probability × reward − cost = 0`. The new-sample button increments the seed. | Independent fixed-probability pseudo-random trials; no real random-device validation. The seed is persisted but does not have a direct seed-entry control.                                                                                                                               |
| `collision`   | Change two masses, opposing velocities and restitution; compare outgoing velocities and kinetic energy. Play, step and restart the motion.                                 | Frictionless isolated 1D collision. `restitution=1` is elastic; `0` gives a common outgoing velocity. No walls or friction; motion holds two seconds after contact.                                                                                                                      |
| `orbit`       | Compare impact, bound orbit and escape under a tangential launch. `speed=1` means circular speed; escape begins at √2.                                                     | Dimensionless GM=1, planet radius 0.5. Initial velocity is `speed / sqrt(radius)`, not the raw speed parameter. Velocity Verlet uses Δt=0.015 and a bounded trajectory. No atmosphere or mission prediction.                                                                             |
| `circuit`     | Compare current and total dissipated power as voltage, resistance and a second parallel branch change.                                                                     | `parallel=0` is one resistor, **not two in series**; `parallel=1` gives two equal parallel resistors with equivalent resistance `resistance/2`. The bulb icon indicates total power and adds zero resistance. Not an LED or component-rating model.                                      |
| `sound`       | Choose sine (`waveform=0`), square (`1`), or sawtooth (`2`), adjust envelope, and compose four semitone offsets. Play one note or the melody; stop sound explicitly.       | The graph shows 15 ms of the sustained oscillator, not its amplitude envelope. A note sustains for 0.25 s between attack and release. Melody notes are scheduled sequentially after release, so a longer release does **not** cause overlap. Output gain is limited to amplitude × 0.12. |
| `color`       | Mix additive RGB, compare black/white text contrast and export CSS custom properties.                                                                                      | Uses linearized sRGB relative luminance; ordinary text target is 4.5:1. This is emitted-light mixing, not paint. CSS export uses `rgb(...)` and a recommended black/white foreground; there is no hex-editor control.                                                                    |

## Nine project stages

| Kind          | Controls and useful challenge                                                                                                                                                                | Model boundaries                                                                                                                                                                                                                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `design`      | Adjust headline size, outer margin, accent hue, 1–3 grid columns and landscape (`format=0`, 640×400) or portrait (`1`, 360×400). Inspect the fixed bilingual festival poster and export SVG. | A constrained layout experiment with fixed copy and shapes; no text editor, image uploader or arbitrary element dragging. Large headlines can overflow at narrow sizes: use that as a check and reduce the size.                                                                                                                             |
| `animation`   | Adjust jump duration, height, contact squash and linear-triangle (`easing=0`) or parabolic (`1`) interpolation. Scrub or play the complete bounce.                                           | Parabolic height is `height × 4p(1−p)` for phase p. Squash approximately preserves area and keeps the character in contact with the floor. The SVG export is a **static frame**, not an animated file. The JSON preserves the settings used for in-app playback.                                                                             |
| `ecosystem`   | Compare prey/predator curves and inspect values at model times 0–16. A dashed baseline uses prey 40, predators 8, capacity 100 and growth 0.7.                                               | Explicit steps of 0.1: prey derivative `growth × prey × (1−prey/capacity) − 0.025 × prey × predators`; predator derivative `0.008 × prey × predators − 0.25 × predators`. Nonnegative populations are enforced. No seasons, migration, disease or randomness; not an ecological forecast.                                                    |
| `separation`  | Enable filtration and evaporation. The mixture begins with 8 insoluble sand particles, 12 dissolved salt particles and 40 water particles. Inspect separate sand and salt collection dishes. | Toggles configure the fixed **filter → evaporate** process, rather than record the chronological order of clicks. Ideal filtration removes sand but not dissolved salt. Evaporation removes water; without filtration the salt remains mixed with sand in the original beaker. No distillation, water recovery or filter-efficiency control. |
| `flood`       | Allocate permeable ground and storage, then compare infiltration, stored water and runoff for a rainfall amount.                                                                             | `infiltration = min(rain,30) × green/100`; `stored = min(storage,rain−infiltration)`; runoff is the remainder. All volumes are equivalent mm over a uniform block. No storm timing, drains, terrain or forecast of real flood depth. The blue layer is a runoff illustration.                                                                |
| `economy`     | Change price, prepared stock, baseline demand, per-cup cost and fixed cost; inspect demand, sales, unsold stock, revenue, unmet demand and profit.                                           | Demand is `max(0,round(traffic × (1−0.16 × (price−5))))`. Sales are limited by stock and demand. Profit is `sales × price − stock × cost − fixed`, so all prepared cups cost money. Deterministic teaching scenarios, not a demand forecast or business recommendation.                                                                      |
| `logic`       | Test keycard A, PIN B and alarm C. `gate=0` requires A AND B; `gate=1` allows A OR B. Inspect all eight truth-table rows.                                                                    | Output is `(A AND/OR B) AND NOT C`. C always inhibits opening; C is **not** a third credential. This is a fixed logic circuit, not an arbitrary gate editor or secure physical lock.                                                                                                                                                         |
| `pathfinding` | Edit an 8×8 maze with click, Enter or Space; scrub breadth-first discovery and reveal the shortest path at the timeline end.                                                                 | Four orthogonal moves with unit cost; no diagonal or weighted search. `maze=0` is open; `maze=1` is a vertical wall with a gap. Choosing a preset clears custom wall flags. Start=0, destination=63, row-major indexing. Walls 1 and 8 seal the start and produce no route.                                                                  |
| `data`        | Compare cleaning strategies, group A/B, column (`chart=0`) and line (`1`) charts, mean and missing counts. Export the selected cleaned CSV and chart SVG.                                    | Two fixed **synthetic weekly reading-minute** datasets, not uploaded observations. `group=0`: `[10,15,12,null,20,18,26,24]`; `group=1`: `[18,22,null,30,24,35,27,40]`. `clean=1` excludes missing readings; `0` substitutes zero. No CSV upload or cell editor. Cleaned line charts leave gaps at missing weeks.                             |

For the data lab, group A's cleaned mean is 125/7 ≈ 17.8571; its zero-filled mean is 125/8 = 15.625. Group B's cleaned mean is 196/7 = 28; its zero-filled mean is 196/8 = 24.5. CSV columns are `week,minutes`; excluded rows keep the remaining original week numbers. Do not write lessons about revenue, temperature, sorting or outlier deletion against this reading-minutes dataset.

## Persistence and reset

The existing `Laboratory` wrapper owns parameter persistence. It identifies work by course, node and section, debounces saves by 350 ms, keeps unsent drafts in session storage when available, and flushes pending work on navigation/unmount and `pagehide`. It restores a recoverable draft before cached work, supplied saved work and initial parameters. Save errors display a retry action. Browser storage and network availability can still fail; do not describe an unacknowledged save as durable.

The `PUT /api/labs` endpoint receives `courseId`, `nodeId`, `sectionId`, `value` and a numeric `version`. The service checks session ownership, resolves the actual lab section, validates its kind-specific parameters, and writes `course.labWork[nodeId][sectionId]`. Stored versions prevent older saves from replacing newer work. Versions must be nonnegative safe integers and at most 60 seconds ahead of server time.

The shared footer reset restores **this section's authored initial parameters** and remounts its renderer. Remount cleanup cancels visual playback and closes the science audio context. This is the single reset action for all laboratories.

The control demonstration temporarily changes a visible control, with a prominent cursor. It preserves learner parameters. If the learner takes over during a demonstration, only their edit is applied to their own work. Save conflicts from another tab offer a deliberate reload of the latest saved version; network failures retain the retry action and recoverable draft.

Playback time, play/pause flags and audio nodes are local transient state, not saved parameter fields. Reopening retains the learner's configuration but starts visual playback paused at its beginning. A lesson change receives a distinct wrapper key. Do not promise to resume at the same animation frame or audio position.

## Artifacts

Every lab has the shared **Download experiment** action: JSON with kind, mission and the current parameter record. It is a download, not an import format with a built-in restore command.

Project stages additionally provide:

- **Export SVG**: the current SVG visual, including its current playback frame. HTML statistics, controls, notes and the separate logic truth table are not embedded in this file.
- **Export project data**: JSON with kind, effective parameters and the stage's result. Results include population histories, search walls/path/discovery order, a logic truth table, or calculated metrics as appropriate.
- **Export cleaned CSV** in the data stage: the selected missing-value treatment and original week indices.

The science color stage additionally exports `palette.css` with `--accent` and `--on-accent`. Other science stages currently rely on the shared JSON parameter download; they do not offer project-style SVG downloads. There is no animated SVG/video export or synthesized audio-file export.

## Accessibility and lesson checks

Controls use native ranges, checkboxes, selects and buttons with English and Traditional Chinese labels. The sphere's rotation slider is an alternative to dragging. Maze cells are keyboard-focusable buttons inside an SVG group; reserved endpoints are not editable. Project timelines can be scrubbed without animation; science moving stages offer a step action. Playback and audio begin only after an explicit user action, and effects clean up when a stage unmounts. Science motion stops when the reduced-motion preference switches on; project stages start paused and provide manual scrubbing, rather than detecting that preference themselves.

Use the live values and explanations alongside diagrams; do not make a mission depend only on color. Project statistics suppress repeated live-region announcements while playing. SVG visuals have accessible labels, but exporting an SVG does not create a full accessible equivalent of all on-page explanatory content. Test the actual lesson with keyboard, touch and its intended viewport before claiming accessibility or layout acceptance.

Author each mission around a reachable manipulation and an observable result. Specify which controls remain fixed, make a prediction before changing them, and use an edge case to check the result. Explain discrepancies with the actual model above. A concept quiz is separate from an automatic check of the learner's saved configuration; this component does not currently include a general goal-rule evaluator or visible teacher-demonstration action schema.

## Dependencies and verification

No third-party visualization or physics package was adopted for these laboratories. The implementation uses the existing React application, hand-authored SVG/HTML/CSS, browser APIs and Web Audio. It does not incorporate OpenMAIC code or assets. Do not describe an external component license review or new 3D/physics library integration as completed.

Relevant checks:

```sh
npx vitest run tests/lab-science.test.ts tests/lab-projects.test.ts tests/project-labs-renderer.test.ts tests/lab-state.test.ts tests/featured-service.test.ts
npm run typecheck
```

Model tests cover geometry, collision conservation, circular-orbit error, probability, resistance, contrast, coaster slopes, shortest paths, water balance, costs, logic, population bounds, separation and bounce endpoints. Project rendering tests cover both languages, keyboard maze targets, bounded persisted values, CSV availability, signal-wire colors and contact-preserving squash. These checks do not replace real-browser checks of saving, reset, playback, audio, exports or lesson correctness.
