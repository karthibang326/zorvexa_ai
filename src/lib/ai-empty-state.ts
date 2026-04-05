import { isDemoModeEnabled } from "@/lib/demo-mode";

export function getAIEmptyStateCopy() {
  if (isDemoModeEnabled()) {
    return {
      title: "Simulating AI decisions in real time...",
      subtitle: "AI managing simulated infrastructure",
    };
  }

  try {
    const raw =
      localStorage.getItem("zorvexa_connected_infra") ?? localStorage.getItem("astraops_connected_infra");
    if (!raw) {
      return {
        title: "Connect your cloud to activate autonomous AI",
        subtitle: "AI will begin autonomous decisions once infrastructure is connected",
      };
    }
    const parsed = JSON.parse(raw) as { provider?: string };
    if (!parsed.provider) {
      return {
        title: "Connect your cloud to activate autonomous AI",
        subtitle: "AI will begin autonomous decisions once infrastructure is connected",
      };
    }
  } catch {
    return {
      title: "Connect your cloud to activate autonomous AI",
      subtitle: "AI will begin autonomous decisions once infrastructure is connected",
    };
  }

  return {
    title: "AI is analyzing your infrastructure...",
    subtitle: "First decisions will appear shortly",
  };
}
