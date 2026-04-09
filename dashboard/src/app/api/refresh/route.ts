import { NextResponse } from "next/server";

// SSE clients waiting for refresh notifications
const clients = new Set<ReadableStreamDefaultController>();

// POST: Claude Code pings this after writing to DB
export async function POST() {
  const timestamp = Date.now();
  for (const controller of clients) {
    try {
      controller.enqueue(`data: ${JSON.stringify({ timestamp })}\n\n`);
    } catch {
      clients.delete(controller);
    }
  }
  return NextResponse.json({ ok: true, timestamp });
}

// GET: SSE stream for dashboard clients
export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const c = {
        enqueue: (data: string) => controller.enqueue(encoder.encode(data)),
      } as ReadableStreamDefaultController;
      clients.add(c);
      // Send initial heartbeat
      controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      // Cleanup on close
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(interval);
          clients.delete(c);
        }
      }, 30000);
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
