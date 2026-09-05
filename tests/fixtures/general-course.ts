import type {
  Chapter,
  Graph,
  LearningNode,
  LearningEnvironment,
} from "../../src/core/protocol";

// Local model double: deliberately different content from the bundled website demo.
export function generalGraph(environment: LearningEnvironment = "web"): Graph {
  return {
    schemaVersion: 2,
    title: "Practice a new skill",
    outcome: "Explain and apply the first steps",
    scopeNote: "",
    requiresConfirmation: false,
    nodes: [
      {
        id: "web",
        title: "First steps",
        objective: "Apply a small change",
        minutes: 4,
        kind: "main",
        prerequisites: [],
        environment,
      },
      {
        id: "html",
        title: "Next steps",
        objective: "Explain the result",
        minutes: 4,
        kind: "main",
        prerequisites: ["web"],
        environment,
      },
    ],
    edges: [{ from: "web", to: "html" }],
  };
}

export function generalChapter(node: LearningNode): Chapter {
  const environment = node.environment || "web";
  const path = environment === "python" ? "/main.py" : "/index.html";
  const code = environment === "python" ? "print(1 + 2)" : "<h1>Hello</h1>";
  return {
    schemaVersion: 2,
    environment,
    nodeId: node.id,
    title: node.title,
    objective: node.objective,
    workspaceSetup:
      environment === "web" || environment === "python" ? { [path]: code } : {},
    sections: [
      {
        id: "explore",
        title: "Observe a change",
        body: "Follow these steps.",
        intent: "explain",
        template: "focus",
        component: {
          type: "steps.sequence",
          steps: [
            { title: "Observe", body: "Look at the starting state." },
            { title: "Change", body: "Make one small change." },
          ],
        },
      },
      environment === "none"
        ? {
            id: "try",
            title: "Cause and effect",
            body: "Inspect each stage.",
            intent: "explain",
            template: "focus",
            component: {
              type: "diagram.flow",
              items: [
                { label: "Cause", description: "An initial change." },
                { label: "Effect", description: "The observable result." },
              ],
            },
          }
        : environment === "terminal"
          ? {
              id: "try",
              title: "Create a directory",
              body: "Run mkdir notes.",
              intent: "practice",
              template: "workspace",
              component: { type: "terminal", commands: ["mkdir notes"] },
              completion: { type: "directory.exists", path: "/notes" },
            }
          : {
              id: "try",
              title: "Edit the example",
              body:
                environment === "python"
                  ? "Change the expression to print(2 + 3), then run it."
                  : "Change the heading to Welcome.",
              intent: "practice",
              template: "workspace",
              component: {
                type: "code.editor",
                path,
                language: environment === "python" ? "python" : "html",
                example: code,
              },
              completion: {
                type: "file.includes",
                path,
                value: environment === "python" ? "print(2 + 3)" : "Welcome",
              },
            },
      {
        id: "check",
        title: "Check your understanding",
        body: "Which helps explain a result?",
        intent: "check",
        template: "focus",
        component: {
          type: "quiz.choice",
          question: "Which helps explain a result?",
          options: ["Ignore changes", "Observe the change"],
          answer: 1,
          explanation: "Compare the starting state with the result.",
        },
        completion: { type: "quiz" },
      },
    ],
    script: [
      { sectionId: "explore", text: "Observe, then change one thing." },
      { sectionId: "try", text: "Try the example and inspect the result." },
      { sectionId: "check", text: "Choose the useful strategy." },
    ],
  };
}
