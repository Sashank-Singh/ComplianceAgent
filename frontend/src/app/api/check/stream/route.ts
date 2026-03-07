import { NextRequest } from "next/server";
import { runComplianceCheck } from "@/lib/compliance/pipeline";

export const maxDuration = 60; // Vercel Pro: 60s. Hobby: 10s - may timeout on slow crawls

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain");
  const maxDepth = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get("max_depth") ?? "1", 10), 1),
    5
  );

  if (!domain?.trim()) {
    return new Response(
      JSON.stringify({ error: "domain is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`)
        );
      };

      try {
        const result = await runComplianceCheck(domain.trim(), {
          maxDepth,
          onProgress: send,
        });
        send("result", result as unknown as Record<string, unknown>);
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "Check failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
