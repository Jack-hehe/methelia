import { createHash, timingSafeEqual } from "node:crypto";

/** Small, optional demo gate. This is not an account or learner identity system. */
export function demoAccess(headers: Headers): Response | null {
  const password = process.env.METHELIA_DEMO_PASSWORD;
  if (process.env.RENDER === "true" && (!password || password.length < 16))
    return new Response("Demo access is not configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  if (!password) return null;
  const authorization = headers.get("authorization") || "";
  const token = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(authorization)?.[1];
  const supplied = token ? Buffer.from(token, "base64").toString("utf8") : "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (timingSafeEqual(digest(supplied), digest(`demo:${password}`)))
    return null;
  return new Response("Methelia demo — sign in to continue.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Methelia Demo", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

/** Render terminates TLS before Next. Trust configured origins, not forwarded headers. */
export function publicOrigin(
  host: string | null,
  protocol: string,
): string | null {
  if (!host) return null;
  const configured = [
    ...(process.env.METHELIA_ALLOWED_ORIGINS || "").split(","),
    process.env.RENDER_EXTERNAL_URL || "",
  ]
    .map((value) => value.trim())
    .filter(Boolean);
  try {
    if (configured.length) {
      for (const value of configured) {
        const url = new URL(value);
        if (url.protocol === "https:" && url.host === host) return url.origin;
      }
      return null;
    }
    if (process.env.RENDER === "true") return null;
    if (protocol !== "http:" && protocol !== "https:") return null;
    return new URL(`${protocol}//${host}`).origin;
  } catch {
    return null;
  }
}
