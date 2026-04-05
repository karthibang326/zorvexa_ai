import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import LaunchSetup from "./LaunchSetup";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/launch", () => ({
  connectCloud: vi.fn(async () => ({ connection: { id: "c1", provider: "aws", status: "connected", validatedAt: "" } })),
  testCloudConnection: vi.fn(async () => ({ result: { ok: true, message: "ok", accountId: "123", simulated: true } })),
  discoverCloudInfra: vi.fn(async () => ({
    discovery: {
      accountId: "123",
      regions: ["us-east-1"],
      clusters: [{ name: "eks-1", region: "us-east-1", status: "ACTIVE" }],
      services: ["api"],
      nodes: { total: 10, ready: 10 },
    },
  })),
  createOrganization: vi.fn(async (name: string) => ({ organization: { id: "org-1", name } })),
  createProject: vi.fn(async (_orgId: string, name: string) => ({ project: { id: "proj-1", name } })),
  createEnvironment: vi.fn(async (_projectId: string, name: string) => ({ environment: { id: "env-1", name } })),
  updateEnvironmentPolicy: vi.fn(async (policy: unknown) => ({
    policy: {
      ...(policy as Record<string, unknown>),
      allowedActionKinds: ["scale", "restart"],
      autonomyMode: "assisted",
      approvalScope: "medium_risk",
      blastRadiusScope: "namespace",
      orgId: "o",
      projectId: "p",
      envId: "e",
      updatedAt: new Date().toISOString(),
    },
  })),
}));

vi.mock("@/lib/demo-mode", () => ({
  setDemoModeEnabled: vi.fn(),
}));

describe("LaunchSetup workspace flow", () => {
  it("should render workspace inputs", () => {
    render(
      <MemoryRouter>
        <LaunchSetup />
      </MemoryRouter>
    );

    expect(screen.getByTestId("org-input")).toBeInTheDocument();
    expect(screen.getByTestId("project-input")).toBeInTheDocument();
    expect(screen.getByTestId("env-select")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-preview")).toHaveTextContent(
      "acme-corp / payments-platform / prod-eu-west-1"
    );
  });

  it("should normalize organization slug as user types", () => {
    render(
      <MemoryRouter>
        <LaunchSetup />
      </MemoryRouter>
    );

    const input = screen.getByTestId("org-input");
    fireEvent.change(input, { target: { value: "Acme Corp" } });
    expect(input).toHaveValue("acme-corp");
    expect(screen.getByTestId("workspace-preview")).toHaveTextContent("acme-corp");
  });

  it("should go to next step on continue", () => {
    render(
      <MemoryRouter>
        <LaunchSetup />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText(/Step 2 · Cloud Connect/i)).toBeInTheDocument();
  });
});
