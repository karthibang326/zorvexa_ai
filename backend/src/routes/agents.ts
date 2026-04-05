import express, { Request, Response } from "express";
import { AgentService } from "../services/agent.service";
import { CreateAgentDTO } from "../models/agent.types";

const router = express.Router();

router.get("/", (req: Request, res: Response) => {
  const agents = AgentService.getAgents();
  res.json(agents);
});

router.post("/", (req: Request, res: Response) => {
  try {
    const data: CreateAgentDTO = req.body;
    
    if (!data.name || !data.type || !data.objective) {
      return res.status(400).json({ error: "Missing required fields: name, type, objective" });
    }

    const newAgent = AgentService.createAgent(data);
    res.status(201).json(newAgent);
  } catch (err) {
    console.error("Error creating agent:", err);
    res.status(500).json({ error: "Failed to create Sentinel Agent" });
  }
});

router.delete("/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const deleted = AgentService.deleteAgent(id);
  if (deleted) {
    res.json({ message: "Agent deleted successully" });
  } else {
    res.status(404).json({ error: "Agent not found" });
  }
});

export default router;
