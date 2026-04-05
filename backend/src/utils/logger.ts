export type LogLevel = "info" | "warn" | "error";

function toRecord(level: LogLevel, msg: string, extra?: Record<string, unknown>) {
  return {
    level,
    msg,
    ...(extra ?? {}),
    ts: new Date().toISOString(),
  };
}

export const logger = {
  info: (msg: string, extra?: Record<string, unknown>) =>
    console.log(JSON.stringify(toRecord("info", msg, extra))),
  warn: (msg: string, extra?: Record<string, unknown>) =>
    console.warn(JSON.stringify(toRecord("warn", msg, extra))),
  error: (msg: string, extra?: Record<string, unknown>) =>
    console.error(JSON.stringify(toRecord("error", msg, extra))),
};

