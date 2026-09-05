/** Self-contained so the same validator can be embedded in the isolated runner. */
export function parsePythonArtifacts(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Invalid generated files.");
  const entries = Object.entries(input);
  if (entries.length > 20) throw new Error("Generated files exceed 20 files.");
  let total = 0;
  const result: Record<string, string> = {};
  for (const [path, content] of entries) {
    if (
      path.length > 200 ||
      !/^\/(?:[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\/)*[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.(?:html|css|js|json|txt|csv)$/i.test(
        path,
      ) ||
      path.split("/").some((part) => part === "." || part === "..")
    )
      throw new Error("Invalid generated file path.");
    if (
      typeof content !== "string" ||
      content.includes("\0") ||
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
        content,
      )
    )
      throw new Error("Generated files must be UTF-8 text.");
    total += content.length;
    if (total > 200000)
      throw new Error("Generated files exceed 200,000 characters.");
    result[path] = content;
  }
  return result;
}
