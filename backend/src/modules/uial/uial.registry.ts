/**
 * UIAL Provider Registry
 *
 * Single source of truth for all registered infrastructure adapters.
 * The hybrid brain and execution engine resolve adapters exclusively
 * through this registry — never by importing adapters directly.
 */
import { awsUIALAdapter } from "./adapters/aws.uial.adapter";
import { azureUIALAdapter } from "./adapters/azure.uial.adapter";
import { gcpUIALAdapter } from "./adapters/gcp.uial.adapter";
import { baremetalUIALAdapter } from "./adapters/baremetal.uial.adapter";
import { vmwareUIALAdapter } from "./adapters/vmware.uial.adapter";
import { k8sOnpremUIALAdapter } from "./adapters/k8s-onprem.uial.adapter";
import type { UIALAdapter, InfraProvider, InfraEnvironment } from "./uial.types";

const ADAPTERS: Record<InfraProvider, UIALAdapter> = {
  aws: awsUIALAdapter,
  azure: azureUIALAdapter,
  gcp: gcpUIALAdapter,
  baremetal: baremetalUIALAdapter,
  vmware: vmwareUIALAdapter,
  "k8s-onprem": k8sOnpremUIALAdapter,
};

export function getAdapter(provider: InfraProvider): UIALAdapter {
  const adapter = ADAPTERS[provider];
  if (!adapter) throw new Error(`UIAL: no adapter registered for provider "${provider}"`);
  return adapter;
}

export function getAdaptersByEnvironment(env: InfraEnvironment): UIALAdapter[] {
  return Object.values(ADAPTERS).filter((a) => a.environment === env);
}

export function getAllAdapters(): UIALAdapter[] {
  return Object.values(ADAPTERS);
}

export function listProviders(): Array<{ provider: InfraProvider; environment: InfraEnvironment; displayName: string }> {
  return Object.values(ADAPTERS).map((a) => ({
    provider: a.provider,
    environment: a.environment,
    displayName: a.displayName,
  }));
}
