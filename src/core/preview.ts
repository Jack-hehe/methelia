import { normalizePath } from "./workspace";
export function buildPreview(
  files: Record<string, string>,
  demoClickId?: string,
  highlightTag?: string,
): string {
  let html =
    files["/index.html"] || "<p>Create index.html to see your website.</p>";
  const local = (path: string) => {
    try {
      return files[normalizePath("/", path)] ?? "";
    } catch {
      return "";
    }
  };
  html = html.replace(
    /<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi,
    (_, path: string) =>
      `<style>${local(path).replace(/<\/style/gi, "<\\/style")}</style>`,
  );
  html = html.replace(
    /<script\b[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (_, path: string) =>
      `<script>${local(path).replace(/<\/script/gi, "<\\/script")}</script>`,
  );
  // Only the independent demonstration opts into this prepared interaction.
  if (demoClickId && /^[a-zA-Z][a-zA-Z0-9_-]{0,99}$/.test(demoClickId))
    html += `<script>document.getElementById(${JSON.stringify(demoClickId)})?.click();</script>`;
  if (highlightTag && /^[a-z][a-z0-9]*$/.test(highlightTag))
    html += `<style>${highlightTag} { outline: 3px solid #7355c9 !important; outline-offset: 6px; }</style>`;
  // The frame is sandboxed without allow-same-origin; CSP additionally blocks networking and navigation.
  const policy =
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; media-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="viewport" content="width=device-width,initial-scale=1">${html}`;
}
