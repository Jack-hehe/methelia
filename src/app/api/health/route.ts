import { getStore } from "../../../server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    if (
      process.env.RENDER === "true" &&
      (process.env.METHELIA_DEMO_PASSWORD?.length || 0) < 16
    )
      throw new Error("Demo access not configured");
    getStore().db.prepare("SELECT 1").get();
    return Response.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
