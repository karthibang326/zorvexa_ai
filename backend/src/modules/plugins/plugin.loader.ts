import { prisma } from "../../lib/prisma";
import { subscribePluginEvent } from "./plugin.event-bus";
import { AstraPlugin, PluginScope } from "./plugin.types";

const entrypointMap: Record<string, string> = {
  "builtin:datadog-observer": "./builtin/datadog-observer.plugin",
  "builtin:ai-agent-remediator": "./builtin/ai-agent-remediator.plugin",
};

const orgUnsubscribers = new Map<string, Array<() => void>>();

async function resolvePluginModule(entrypoint: string): Promise<AstraPlugin> {
  const target = entrypointMap[entrypoint];
  if (!target) throw new Error(`Unsupported plugin entrypoint: ${entrypoint}`);
  const mod = await import(target);
  const plugin = mod.default as AstraPlugin;
  if (!plugin?.name || !plugin?.hooks || typeof plugin.init !== "function") {
    throw new Error(`Invalid plugin contract for ${entrypoint}`);
  }
  return plugin;
}

export async function unloadPluginsForOrg(orgId: string) {
  const unsub = orgUnsubscribers.get(orgId) ?? [];
  for (const off of unsub) off();
  orgUnsubscribers.delete(orgId);
}

export async function loadPluginsForScope(scope: PluginScope) {
  const prismaAny = prisma as any;
  await unloadPluginsForOrg(scope.orgId);

  const installed = await prismaAny.installedPlugin.findMany({
    where: {
      orgId: scope.orgId,
      enabled: true,
      OR: [{ projectId: null }, { projectId: scope.projectId ?? null }],
    },
    include: { plugin: true },
  });

  const offList: Array<() => void> = [];
  for (const item of installed) {
    const plugin = await resolvePluginModule(String(item.plugin.entrypoint));
    await plugin.init((item.config ?? {}) as Record<string, unknown>);
    const hooks = plugin.hooks ?? {};
    for (const [event, handler] of Object.entries(hooks)) {
      if (!handler) continue;
      offList.push(subscribePluginEvent(event as any, handler as any));
    }
  }

  orgUnsubscribers.set(scope.orgId, offList);
  return {
    loaded: installed.length,
    plugins: installed.map((x: any) => ({
      id: x.plugin.id,
      name: x.plugin.name,
      version: x.plugin.version,
      type: x.plugin.type,
      entrypoint: x.plugin.entrypoint,
    })),
  };
}

