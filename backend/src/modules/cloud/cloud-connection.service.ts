import { CloudProvider } from "./cloud.types";

export type CloudConnectionInput = {
  orgId: string;
  projectId?: string;
  envId?: string;
  provider: CloudProvider;
  name: string;
  credentials: {
    roleArn?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    externalId?: string;
    serviceAccountJson?: string;
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
    subscriptionId?: string;
  };
};

export type CloudConnection = {
  id: string;
  orgId: string;
  projectId?: string;
  envId?: string;
  provider: CloudProvider;
  name: string;
  status: "connected" | "invalid";
  validatedAt: string;
};

const store = new Map<string, CloudConnection>();

function validate(provider: CloudProvider, credentials: CloudConnectionInput["credentials"]) {
  if (provider === "aws") {
    return Boolean(credentials.roleArn?.trim()) || Boolean(credentials.accessKeyId?.trim() && credentials.secretAccessKey?.trim());
  }
  if (provider === "gcp") return Boolean(credentials.serviceAccountJson?.trim());
  return Boolean(
    credentials.tenantId?.trim() &&
      credentials.clientId?.trim() &&
      credentials.clientSecret?.trim() &&
      credentials.subscriptionId?.trim()
  );
}

export const cloudConnectionService = {
  connect(input: CloudConnectionInput): CloudConnection {
    const ok = validate(input.provider, input.credentials);
    const id = `conn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const connection: CloudConnection = {
      id,
      orgId: input.orgId,
      projectId: input.projectId,
      envId: input.envId,
      provider: input.provider,
      name: input.name,
      status: ok ? "connected" : "invalid",
      validatedAt: new Date().toISOString(),
    };
    store.set(id, connection);
    return connection;
  },

  list(scope: { orgId: string; projectId?: string; envId?: string }) {
    return Array.from(store.values()).filter((c) => {
      if (c.orgId !== scope.orgId) return false;
      if (scope.projectId && c.projectId && c.projectId !== scope.projectId) return false;
      if (scope.envId && c.envId && c.envId !== scope.envId) return false;
      return true;
    });
  },
};

