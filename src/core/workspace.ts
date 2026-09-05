export type Workspace = {
  revision: number;
  cwd: string;
  files: Record<string, string>;
  directories: string[];
  previewRunning: boolean;
  history: string[];
};
export function emptyWorkspace(): Workspace {
  return {
    revision: 0,
    cwd: "/",
    files: {},
    directories: ["/"],
    previewRunning: false,
    history: [],
  };
}
export function normalizePath(cwd: string, path: string): string {
  if (!path || path.includes("\\") || path.includes("\0") || path.length > 200)
    throw new Error("Invalid virtual path");
  const parts = (path.startsWith("/") ? path : `${cwd}/${path}`).split("/");
  const result: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!result.length) throw new Error("Cannot leave virtual root");
      result.pop();
    } else {
      if (!/^[\p{L}\p{N}_. -]+$/u.test(part)) throw new Error("Invalid path");
      result.push(part);
    }
  }
  return "/" + result.join("/");
}
export function saveFiles(
  ws: Workspace,
  files: Record<string, string>,
  base: number,
): Workspace {
  if (base !== ws.revision)
    throw new Error("Workspace conflict: reload the latest files");
  const next = structuredClone(ws);
  for (const [name, value] of Object.entries(files)) {
    const path = normalizePath("/", name);
    if (path === "/" || next.directories.includes(path))
      throw new Error("Path is a directory");
    if (typeof value !== "string" || value.length > 100000)
      throw new Error("File too large");
    const parent = path.slice(0, path.lastIndexOf("/")) || "/";
    if (!next.directories.includes(parent))
      throw new Error("Parent directory does not exist");
    next.files[path] = value;
  }
  if (
    Object.keys(next.files).length > 60 ||
    Object.values(next.files).reduce((n, v) => n + v.length, 0) > 1000000
  )
    throw new Error("Workspace limit reached");
  next.revision++;
  return next;
}
export function runCommand(
  ws: Workspace,
  command: string,
): { workspace: Workspace; output: string } {
  const next = structuredClone(ws);
  let output = "";
  try {
    if (command.length > 300 || /[;&|`$<>]/.test(command))
      throw new Error("Only supported practice commands can run");
    const [cmd, ...args] = command.trim().split(/\s+/);
    const arg = args.join(" ");
    const path = arg ? normalizePath(next.cwd, arg) : next.cwd;
    if (command.trim() === "python -m http.server 8000") {
      next.previewRunning = true;
      output = "Website preview started at port 8000 (practice adapter).";
    } else if (cmd === "pwd" && !arg) output = next.cwd;
    else if (cmd === "clear" && !arg) output = "";
    else if (cmd === "ls") {
      if (!next.directories.includes(path))
        throw new Error("Directory not found");
      const prefix = path === "/" ? "/" : path + "/";
      output =
        [
          ...next.directories.filter((p) => p !== path),
          ...Object.keys(next.files),
        ]
          .filter(
            (p) =>
              p.startsWith(prefix) && !p.slice(prefix.length).includes("/"),
          )
          .map(
            (p) =>
              p.slice(prefix.length) +
              (next.directories.includes(p) ? "/" : ""),
          )
          .join("\n") || "(empty)";
    } else if (cmd === "cd" && arg) {
      if (!next.directories.includes(path))
        throw new Error("Directory not found");
      next.cwd = path;
    } else if (cmd === "cat" && arg) {
      if (!(path in next.files)) throw new Error("File not found");
      output = next.files[path];
    } else if ((cmd === "mkdir" || cmd === "touch") && arg) {
      const parent = path.slice(0, path.lastIndexOf("/")) || "/";
      if (!next.directories.includes(parent))
        throw new Error("Parent directory does not exist");
      if (cmd === "mkdir") {
        if (path in next.files || next.directories.includes(path))
          throw new Error("Path already exists");
        next.directories.push(path);
      } else {
        if (next.directories.includes(path))
          throw new Error("Path is a directory");
        next.files[path] ??= "";
      }
    } else
      throw new Error(
        "Command not supported. Try pwd, ls, cd, mkdir, touch, cat, clear, or python -m http.server 8000.",
      );
    if (next.directories.length > 60 || Object.keys(next.files).length > 60)
      throw new Error("Workspace limit reached");
    next.history = [...next.history, command].slice(-50);
    next.revision++;
    return { workspace: next, output: output.slice(0, 12000) };
  } catch (error) {
    return {
      workspace: ws,
      output: error instanceof Error ? error.message : "Command failed",
    };
  }
}
