export interface InfraPlan {
  cloud: "aws" | "gcp" | "azure";
  services: string[];
  scaling: boolean;
  monitoring: boolean;
  appName: string;
  region: string;
}

export function buildInfraPlan(prompt: string): InfraPlan {
  const lower = prompt.toLowerCase();
  const cloud = lower.includes("gcp") || lower.includes("gke")
    ? "gcp"
    : lower.includes("azure") || lower.includes("aks")
      ? "azure"
      : "aws";
  const services: string[] = [];
  if (cloud === "aws") services.push("EKS", "ALB");
  if (cloud === "gcp") services.push("GKE", "LoadBalancer");
  if (cloud === "azure") services.push("AKS", "ApplicationGateway");
  if (lower.includes("monitor")) services.push("Monitoring");
  if (lower.includes("node.js") || lower.includes("nodejs")) services.push("NodeApp");

  return {
    cloud,
    services,
    scaling: lower.includes("autoscal") || lower.includes("scalable"),
    monitoring: lower.includes("monitor"),
    appName: "app-service",
    region: cloud === "aws" ? "us-east-1" : cloud === "gcp" ? "us-central1" : "eastus",
  };
}

