import Redis from "ioredis";
import { env } from "../../config/env";
import { logError, logInfo } from "../../lib/logger";
import type { AiStreamEventPayload } from "./ai-stream.types";

const CHANNEL = "ai:stream";

let publisher: Redis | null = null;
let subscriber: Redis | null = null;

function getPublisher(): Redis | null {
  if (env.AI_STREAM_USE_REDIS !== "true") return null;
  if (!publisher) {
    publisher = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, enableOfflineQueue: false });
    publisher.on("error", (e) => logError("ai_stream_redis_pub_error", { message: String(e) }));
  }
  return publisher;
}

/** Publish event to Redis so other API instances can fan-out over WebSocket (production). */
export async function publishAiStreamToRedis(payload: AiStreamEventPayload): Promise<void> {
  const pub = getPublisher();
  if (!pub) return;
  try {
    await pub.publish(CHANNEL, JSON.stringify(payload));
  } catch (e) {
    logError("ai_stream_redis_publish_failed", { message: e instanceof Error ? e.message : String(e) });
  }
}

export function startAiStreamRedisSubscriber(onPayload: (payload: AiStreamEventPayload) => void): () => void {
  if (env.AI_STREAM_USE_REDIS !== "true") {
    return () => {};
  }
  subscriber = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, enableOfflineQueue: false });
  subscriber.on("error", (e) => logError("ai_stream_redis_sub_error", { message: String(e) }));
  void subscriber.subscribe(CHANNEL, (err) => {
    if (err) logError("ai_stream_redis_subscribe_failed", { message: String(err) });
    else logInfo("ai_stream_redis_subscribed", { channel: CHANNEL });
  });
  subscriber.on("message", (_ch, message) => {
    try {
      const parsed = JSON.parse(message) as AiStreamEventPayload;
      if (parsed?.type === "ai.stream" && parsed.version === 1) {
        onPayload(parsed);
      }
    } catch {
      // ignore malformed
    }
  });
  return () => {
    void subscriber?.unsubscribe(CHANNEL);
    void subscriber?.quit();
    subscriber = null;
  };
}
