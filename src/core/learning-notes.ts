import type { Course, NodeNote, PackageState } from "./state";
export function learningNote(
  course: Course,
  nodeId: string,
  pkg: PackageState,
): NodeNote {
  const previous = course.notes?.[nodeId];
  const chapter = pkg.chapter;
  return {
    packageId: pkg.id,
    summary:
      chapter?.sections.map((s) => ({
        title: s.title,
        body:
          s.component.type === "lesson.article"
            ? [...s.component.paragraphs, s.component.takeaway].join("\n\n")
            : s.component.type === "concept.canvas"
              ? [
                  s.body,
                  ...s.component.cards.map((c) => `${c.title}：${c.body}`),
                ].join("\n")
              : s.component.type === "quiz.choice"
                ? course.progress[nodeId]?.done.includes(s.id)
                  ? s.component.explanation
                  : s.component.question
                : s.body,
      })) || [],
    checkpoints:
      chapter?.sections
        .filter((s) => s.completion)
        .map((s) => {
          const attempts = (course.attempts || []).filter(
            (a) => a.nodeId === nodeId && a.sectionId === s.id,
          );
          return {
            sectionId: s.id,
            title: s.title,
            attempts: attempts.length,
            firstPassed: attempts[0]?.passed ?? false,
            lastPassed: attempts.at(-1)?.passed ?? false,
            records: attempts.map(
              ({ passed, at, usedHelp, actual, expected }) => ({
                passed,
                at,
                usedHelp,
                actual,
                expected,
              }),
            ),
          };
        }) || [],
    questions: Array.from(
      new Set([
        ...(previous?.questions || []),
        ...course.messages
          .filter((m) => m.role === "user" && m.nodeId === nodeId)
          .map((m) => m.text),
      ]),
    ),
    personal: previous?.personal || "",
    revision: previous?.revision || 0,
  };
}
