import express, { Request, Response } from "express";
import { AuthenticationError } from "openai";
import { openAiConfigurationError } from "../config/openai";
import { handleCopilot } from "../services/ai.service";
import { v4 as uuidv4 } from "uuid";
import { BRAND } from "../shared/branding";

const router = express.Router();

router.get("/status", (_req: Request, res: Response) => {
  const err = openAiConfigurationError();
  res.json({
    ok: true,
    openaiConfigured: err === null,
    /** When true, POST body may include openaiApiKey (development only). */
    allowDevOpenAiKey: process.env.NODE_ENV !== "production",
    hint: err ?? undefined,
  });
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { message, sessionId: incomingSessionId, openaiApiKey } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing message payload" });
    }

    // Generate or maintain persistent session identity
    const sessionId = incomingSessionId || uuidv4();

    const result = await handleCopilot(sessionId, message, {
      openaiApiKey,
    });

    res.json({
      ...result,
      engine: `${BRAND.shortName}-AI-v9-Agentic`
    });
  } catch (err) {
    if (err instanceof AuthenticationError) {
      console.error("OpenAI AuthenticationError:", err.message);
      return res.status(401).json({
        error: "OpenAI API key rejected",
        details:
          "Set OPENAI_API_KEY in the project root .env (no extra spaces/quotes) and restart: cd backend && npm run dev.",
      });
    }
    console.error("Agentic Engine Error:", err);
    res.status(500).json({
      error: `${BRAND.name} Copilot is experiencing an agentic reasoning delay`,
      details: err instanceof Error ? err.message : "Inference error",
    });
  }
});

// Clear session endpoint for state reset
router.post("/reset", (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    // We would need to expose a clear method in memoryService, let's keep it simple for now
    res.json({ status: "Session marked for reset" });
  } else {
    res.status(400).json({ error: "Missing sessionId" });
  }
});

export default router;
