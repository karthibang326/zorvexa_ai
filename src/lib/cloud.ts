import { api } from "./api";

export type ControlPlaneStatus = {
  id: "aws" | "gcp" | "azure" | "kubernetes";
  label: string;
  connected: boolean;
  authMode: string;
  detail?: string;
};

export type CloudMetricRow = {
  provider: "aws" | "gcp" | "azure";
  cpu: number;
  memory: number;
  cost: number;
};

export type MultiCloudDashboard = {
  controlPlanes: ControlPlaneStatus[];
  metrics: CloudMetricRow[];
};

/** Aggregated control-plane health + per-provider cost signals for the dashboard. */
export async function fetchMultiCloudDashboard(): Promise<MultiCloudDashboard> {
  const { data } = await api.get<MultiCloudDashboard>("/cloud/status");
  return data;
}
