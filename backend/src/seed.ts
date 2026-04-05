import { prisma } from "./lib/prisma";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "operator@quantumops.dev" },
    update: {},
    create: { email: "operator@quantumops.dev", role: "operator" },
  });

  const wf = await prisma.workflow.create({
    data: {
      name: "Sample Auto Heal",
      createdBy: user.id,
      status: "DRAFT",
      version: 1,
      versions: {
        create: {
          version: 1,
          nodes: [
            { id: "n1", type: "HTTP", label: "Health Check", config: { url: "https://httpbin.org/get" } },
            { id: "n2", type: "AI", label: "Analyze Risk", config: {} },
          ],
          edges: [{ source: "n1", target: "n2" }],
        },
      },
    },
  });

  console.log("Seed complete:", { userId: user.id, workflowId: wf.id });
}

main().finally(async () => {
  await prisma.$disconnect();
});

