/**
 * ASTRA event bus — Kafka-style topic names with in-process pub/sub.
 * Swap implementation for Redpanda/Kafka without changing publishers.
 */

export const AstraTopics = {
  METRICS_STREAM: "metrics.stream",
  LOGS_STREAM: "logs.stream",
  AI_DECISIONS: "ai.decisions",
  ACTIONS_EXECUTE: "actions.execute",
  FEEDBACK_LOOP: "feedback.loop",
} as const;

export type AstraTopic = (typeof AstraTopics)[keyof typeof AstraTopics];

export type AstraEnvelope<T = unknown> = {
  topic: AstraTopic;
  ts: string;
  orgId?: string;
  projectId?: string;
  envId?: string;
  payload: T;
};

type Subscriber = (event: AstraEnvelope) => void;

const subscribers = new Set<Subscriber>();
const ring: AstraEnvelope[] = [];
const RING_MAX = 500;

function pushRing(ev: AstraEnvelope) {
  ring.push(ev);
  if (ring.length > RING_MAX) ring.splice(0, ring.length - RING_MAX);
}

export function subscribeAstraBus(handler: Subscriber): () => void {
  subscribers.add(handler);
  return () => subscribers.delete(handler);
}

export async function publishAstraEvent<T>(topic: AstraTopic, payload: T, ctx?: { orgId?: string; projectId?: string; envId?: string }) {
  const envelope: AstraEnvelope<T> = {
    topic,
    ts: new Date().toISOString(),
    orgId: ctx?.orgId,
    projectId: ctx?.projectId,
    envId: ctx?.envId,
    payload,
  };
  pushRing(envelope);
  const tasks = Array.from(subscribers).map((s) => Promise.resolve(s(envelope)));
  await Promise.allSettled(tasks);
}

export function getRecentAstraEvents(since = 100): AstraEnvelope[] {
  return ring.slice(-since);
}
