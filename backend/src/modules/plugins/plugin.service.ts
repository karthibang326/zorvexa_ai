import { prisma } from "../../lib/prisma";
import { emitPluginEvent } from "./plugin.event-bus";
import { loadPluginsForScope } from "./plugin.loader";
import { PluginScope } from "./plugin.types";

export const pluginService = {
  async seedOfficialCatalog() {
    const prismaAny = prisma as any;
    const catalog = [
      {
        name: "Datadog Observer",
        type: "observability",
        version: "1.0.0",
        configSchema: { apiKey: "string", site: "string" },
        entrypoint: "builtin:datadog-observer",
        isOfficial: true,
        priceMonthly: 49,
        description: "Stream AstraOps metrics/incidents to Datadog.",
      },
      {
        name: "AI Agent Remediator",
        type: "ai",
        version: "1.0.0",
        configSchema: { policy: "string" },
        entrypoint: "builtin:ai-agent-remediator",
        isOfficial: true,
        priceMonthly: 99,
        description: "Autonomous SRE actions from incident hooks.",
      },
    ];

    for (const item of catalog) {
      await prismaAny.plugin.upsert({
        where: { name_version: { name: item.name, version: item.version } },
        create: item,
        update: item,
      });
    }
  },

  async listCatalog(type?: string) {
    const prismaAny = prisma as any;
    return prismaAny.plugin.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ isOfficial: "desc" }, { name: "asc" }],
    });
  },

  async listInstalled(scope: PluginScope) {
    const prismaAny = prisma as any;
    return prismaAny.installedPlugin.findMany({
      where: { orgId: scope.orgId },
      include: { plugin: true },
      orderBy: { installedAt: "desc" },
    });
  },

  async install(scope: PluginScope, input: { pluginId: string; config?: Record<string, unknown> }) {
    const prismaAny = prisma as any;
    const plugin = await prismaAny.plugin.findUnique({ where: { id: input.pluginId } });
    if (!plugin) throw new Error("Plugin not found");
    await prismaAny.installedPlugin.upsert({
      where: {
        pluginId_orgId_projectId_environment: {
          pluginId: input.pluginId,
          orgId: scope.orgId,
          projectId: scope.projectId ?? null,
          environment: scope.envId ?? null,
        },
      },
      create: {
        pluginId: input.pluginId,
        orgId: scope.orgId,
        projectId: scope.projectId ?? null,
        environment: scope.envId ?? null,
        config: (input.config ?? {}) as any,
        enabled: true,
      },
      update: {
        config: (input.config ?? {}) as any,
        enabled: true,
      },
    });
    return loadPluginsForScope(scope);
  },

  async setEnabled(scope: PluginScope, installId: string, enabled: boolean) {
    const prismaAny = prisma as any;
    await prismaAny.installedPlugin.updateMany({
      where: { id: installId, orgId: scope.orgId },
      data: { enabled },
    });
    return loadPluginsForScope(scope);
  },

  async reload(scope: PluginScope) {
    return loadPluginsForScope(scope);
  },

  async emit(event: "onMetric" | "onIncident" | "onDeploy", payload: Record<string, unknown>) {
    await emitPluginEvent(event, payload);
    return { delivered: true, event };
  },
};

