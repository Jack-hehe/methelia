import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { zipSync, strToU8 } from "fflate";
import { getStore } from "../../../server/db";
import { LearningService } from "../../../server/service";
import { generateHelp, modelConfigured } from "../../../server/model";
import { nodeSchema } from "../../../core/protocol";
import { sameOrigin } from "../../../server/origin";
import { pageAudioArtifactKey } from "../../../server/page-audio";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const short = z.string().min(1).max(150);
const courseBody = z.object({ courseId: short });
async function readBody(request: NextRequest): Promise<unknown> {
  if (!request.body) return {};
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let body = "",
    size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 250000) {
      await reader.cancel();
      throw new Error("Request too large");
    }
    body += decoder.decode(value, { stream: true });
  }
  return JSON.parse(body + decoder.decode());
}
async function handle(request: NextRequest) {
  const store = getStore(),
    service = new LearningService(store);
  let session = "";
  try {
    const origin = request.headers.get("origin");
    if (
      request.method !== "GET" &&
      origin &&
      !sameOrigin(origin, request.headers.get("host"), request.nextUrl.protocol)
    )
      return NextResponse.json(
        { error: "Origin not allowed" },
        { status: 403 },
      );
    session = service.session(request.cookies.get("methelia_session")?.value);
    const path = request.nextUrl.pathname.slice("/api/".length).split("/");
    const data = request.method === "GET" ? {} : await readBody(request);
    let result: unknown;
    if (path[0] === "sessions")
      result = {
        course: service.latest(session),
        configured: {
          ai: modelConfigured(),
          fish: Boolean(
            process.env.FISH_AUDIO_API_KEY &&
            process.env.FISH_AUDIO_REFERENCE_ID,
          ),
        },
      };
    else if (
      path[0] === "courses" &&
      request.method === "POST" &&
      path.length === 1
    ) {
      const body = z
        .object({
          goal: z.string().min(1).max(1500),
          mode: z.enum(["demo", "live"]),
          requestId: short,
        })
        .parse(data);
      result = service.createCourse(
        session,
        body.goal,
        body.mode,
        body.requestId,
      );
    } else if (path[0] === "courses" && path[1] && request.method === "GET")
      result = service.getCourse(session, path[1]);
    else if (
      path[0] === "courses" &&
      path[2] === "advance" &&
      request.method === "POST"
    )
      result = service.advance(session, path[1]);
    else if (
      path[0] === "courses" &&
      path[2] === "retry" &&
      request.method === "POST"
    ) {
      result = service.mutate(session, path[1], (c) => {
        if (c.status === "failed") {
          c.status = "planning";
          c.error = undefined;
          store.db
            .prepare(
              "UPDATE generation_jobs SET status='queued' WHERE id=? AND status='failed'",
            )
            .run(`graph:${c.id}`);
        }
        return service.snapshot(c);
      });
    } else if (path[0] === "chapters" && path[1] && request.method === "GET") {
      const owner = store.db
        .prepare("SELECT course_id FROM chapter_packages WHERE id=?")
        .get(path[1]) as { course_id: string } | undefined;
      if (!owner) throw new Error("Chapter not found");
      service.owned(session, owner.course_id);
      const pkg = store.getPackage(path[1])!;
      result =
        path[2] === "status"
          ? { status: pkg.status, speech: pkg.speech, error: pkg.error }
          : pkg;
    } else if (
      path[0] === "workspace" &&
      path.length === 1 &&
      request.method === "GET"
    ) {
      result = service.owned(
        session,
        request.nextUrl.searchParams.get("courseId") || "",
      ).workspace;
    } else if (
      path[0] === "chapters" &&
      request.method === "POST" &&
      path[2] === "retry"
    ) {
      const body = courseBody.extend({ nodeId: short }).parse(data);
      result = service.retry(session, body.courseId, body.nodeId);
    } else if (
      path[0] === "progress" &&
      path[1] === "events" &&
      request.method === "POST"
    ) {
      const body = courseBody
        .extend({
          nodeId: short,
          time: z.number().finite().optional(),
          sectionId: z.string().max(100).optional(),
          follow: z.boolean().optional(),
          subtitleOnly: z.boolean().optional(),
        })
        .parse(data);
      result = service.saveProgress(session, body.courseId, body.nodeId, body);
    } else if (
      path[0] === "progress" &&
      path[1] === "check" &&
      request.method === "POST"
    ) {
      const body = courseBody
        .extend({ sectionId: short, answer: z.number().int().optional() })
        .parse(data);
      result = service.check(
        session,
        body.courseId,
        body.sectionId,
        body.answer,
      );
    } else if (
      path[0] === "workspace" &&
      path[1] === "files" &&
      request.method === "PUT"
    ) {
      const body = courseBody
        .extend({
          files: z.record(z.string(), z.string().max(100000)),
          baseRevision: z.number().int(),
        })
        .parse(data);
      result = service.saveWorkspace(
        session,
        body.courseId,
        body.files,
        body.baseRevision,
      );
    } else if (
      path[0] === "workspace" &&
      path[1] === "commands" &&
      request.method === "POST"
    ) {
      const body = courseBody
        .extend({ command: z.string().max(300) })
        .parse(data);
      result = service.command(session, body.courseId, body.command);
    } else if (
      path[0] === "workspace" &&
      path[1] === "export" &&
      request.method === "GET"
    ) {
      const course = service.owned(
        session,
        request.nextUrl.searchParams.get("courseId") || "",
      );
      const zip = zipSync(
        Object.fromEntries(
          Object.entries(course.workspace.files).map(([p, v]) => [
            p.slice(1),
            strToU8(v),
          ]),
        ),
      );
      return new NextResponse(zip as BodyInit, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="my-website.zip"',
          "Cache-Control": "no-store",
        },
      });
    } else if (
      path[0] === "help" &&
      path[1] === "messages" &&
      request.method === "POST"
    ) {
      const body = courseBody
        .extend({
          question: z.string().min(1).max(2000),
          sectionId: z.string().max(100).optional(),
        })
        .parse(data);
      const c = service.owned(session, body.courseId);
      const canBranch = Boolean(
        c.graph?.edges.some((e) => e.from === c.currentNodeId),
      );
      const reply =
        c.mode === "demo"
          ? {
              answer:
                "這是體驗模式的示範回覆。HTML 決定內容的意義與結構，CSS 負責樣式，JavaScript 負責互動。如果還不熟悉，可以先補上一個 HTML 基礎節點；完成目前章節後，會先走這條補強路徑，再回到主線。",
              nodes: canBranch
                ? [
                    {
                      id: "support-" + randomUUID(),
                      title: "HTML 標籤與元素",
                      objective: "理解開始標籤、內容與結束標籤的關係",
                      minutes: 4,
                      kind: "support" as const,
                      prerequisites: [],
                    },
                  ]
                : [],
            }
          : await generateHelp(body.question, {
              goal: c.goal,
              node: c.graph?.nodes.find((n) => n.id === c.currentNodeId),
              chapter: service.getChapter(session, c.id, c.currentNodeId)
                .chapter,
              sectionId: body.sectionId,
            });
      result = service.appendMessages(session, c.id, [
        { id: randomUUID(), role: "user", text: body.question },
        {
          id: randomUUID(),
          role: "assistant",
          text: reply.answer,
          nodes: canBranch ? reply.nodes : [],
        },
      ]);
    } else if (
      path[0] === "branches" &&
      path[1] === "preview" &&
      request.method === "POST"
    ) {
      const body = z
        .union([
          courseBody
            .extend({ nodes: z.array(nodeSchema).min(1).max(3) })
            .strict(),
          courseBody
            .extend({
              topic: z.string().trim().min(1).max(120),
              baseRevision: z.number().int().nonnegative(),
              afterId: short,
            })
            .strict(),
        ])
        .parse(data);
      // A requested topic is a node definition, not a chat message. Its chapter
      // is prepared by the existing node generator only after confirmation.
      result =
        "topic" in body
          ? service.previewBranch(
              session,
              body.courseId,
              [
                {
                  id: "support-" + randomUUID(),
                  title: body.topic,
                  objective: body.topic,
                  minutes: 5,
                  kind: "support",
                  prerequisites: [],
                },
              ],
              body,
            )
          : service.previewBranch(session, body.courseId, body.nodes);
    } else if (
      path[0] === "branches" &&
      path[1] === "cancel" &&
      request.method === "POST"
    ) {
      const body = courseBody.extend({ previewId: short }).parse(data);
      result = service.cancelBranch(session, body.courseId, body.previewId);
    } else if (
      path[0] === "branches" &&
      path[1] === "confirm" &&
      request.method === "POST"
    ) {
      const body = courseBody
        .extend({ previewId: short, baseRevision: z.number().int() })
        .parse(data);
      result = service.confirmBranch(
        session,
        body.courseId,
        body.previewId,
        body.baseRevision,
      );
    } else if (path[0] === "audio" && path[1] && request.method === "GET") {
      const row = store.db
        .prepare("SELECT course_id FROM chapter_packages WHERE id=?")
        .get(path[1]) as { course_id: string } | undefined;
      if (!row) throw new Error("Audio not found");
      service.owned(session, row.course_id);
      const pkg = store.getPackage(path[1]);
      if (!pkg) throw new Error("Audio not found");
      const sectionId = request.nextUrl.searchParams.get("sectionId");
      let artifactId = path[1];
      if (sectionId !== null) {
        if (!pkg.chapter?.sections.some((section) => section.id === sectionId))
          throw new Error("Audio not found");
        const page = pkg.pageAudio?.[sectionId];
        if (!page || page.status !== "ready")
          throw new Error("Audio not found");
        artifactId = pageAudioArtifactKey(pkg.id, sectionId);
      } else if (pkg.pageAudio) throw new Error("Audio not found");
      const artifact = store.db
        .prepare("SELECT audio,content_type FROM audio_artifacts WHERE id=?")
        .get(artifactId) as
        { audio: Uint8Array; content_type: string } | undefined;
      if (!artifact) throw new Error("Audio not found");
      const size = artifact.audio.byteLength;
      const range = request.headers.get("range");
      let start = 0,
        end = size - 1;
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2]))
          return new NextResponse(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${size}` },
          });
        if (!match[1]) start = Math.max(0, size - Number(match[2]));
        else {
          start = Number(match[1]);
          if (match[2]) end = Math.min(end, Number(match[2]));
        }
        if (start >= size || start > end)
          return new NextResponse(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${size}` },
          });
      }
      return new NextResponse(
        artifact.audio.slice(start, end + 1) as BodyInit,
        {
          status: range ? 206 : 200,
          headers: {
            "Content-Type": artifact.content_type,
            "Accept-Ranges": "bytes",
            "Content-Length": String(end - start + 1),
            "Cache-Control": "private, no-store",
            ...(range
              ? { "Content-Range": `bytes ${start}-${end}/${size}` }
              : {}),
          },
        },
      );
    } else
      return NextResponse.json(
        { error: "Endpoint not found" },
        { status: 404 },
      );
    const response = NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
    response.cookies.set("methelia_session", session, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "請檢查輸入格式"
        : error instanceof Error
          ? error.message
          : "Request failed";
    return NextResponse.json(
      { error: message },
      {
        status: /not found/i.test(message)
          ? 404
          : /conflict/i.test(message)
            ? 409
            : 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
