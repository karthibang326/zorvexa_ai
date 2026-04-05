import OpenAI from "openai";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getOpenAiClient() {
  const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  const baseURL = (process.env.OPENAI_BASE_URL ?? "").trim() || undefined;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey, baseURL });
}

const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

export async function callLLM(prompt: string, opts?: { timeoutMs?: number; model?: string }) {
  const timeoutMs = Math.max(1000, opts?.timeoutMs ?? 10_000);
  const model = opts?.model ?? (process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini");

  const client = getOpenAiClient();

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await client.chat.completions.create(
        {
          model,
          messages: [
            {
              role: "system",
              content: "You are a reliable backend service that outputs only JSON when asked.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 600,
        },
        { timeout: timeoutMs }
      );
      const text = res.choices?.[0]?.message?.content ?? "";
      return text;
    } catch (e: any) {
      lastErr = e;
      const status = typeof e?.status === "number" ? e.status : undefined;
      if (status && RETRYABLE.has(status) && attempt < 2) {
        await sleep(250 * Math.pow(2, attempt));
        continue;
      }
      throw e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("LLM call failed");
}

export function safeJsonParse<T>(text: string): { ok: true; value: T } | { ok: false; error: string } {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const slice = start >= 0 && end >= 0 ? text.slice(start, end + 1) : text;
    return { ok: true, value: JSON.parse(slice) as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "invalid json" };
  }
}

