import { FastifyReply } from "fastify";
import { EventEmitter } from "events";

const emitter = new EventEmitter();
emitter.setMaxListeners(1000);

export function publishRunEvent(runId: string, payload: Record<string, unknown>) {
  emitter.emit(`run:${runId}`, payload);
}

export function attachRunStream(runId: string, reply: FastifyReply) {
  reply.raw.setHeader("Content-Type", "text/event-stream");
  reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
  reply.raw.setHeader("Connection", "keep-alive");
  reply.raw.setHeader("X-Accel-Buffering", "no");
  reply.raw.flushHeaders?.();

  const onEvent = (payload: unknown) => {
    reply.raw.write(`event: update\n`);
    reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  emitter.on(`run:${runId}`, onEvent);
  reply.raw.write(`event: connected\ndata: {"runId":"${runId}"}\n\n`);

  const heartbeat = setInterval(() => {
    reply.raw.write(`event: heartbeat\ndata: {}\n\n`);
  }, 15000);

  reply.raw.on("close", () => {
    clearInterval(heartbeat);
    emitter.off(`run:${runId}`, onEvent);
  });
}

