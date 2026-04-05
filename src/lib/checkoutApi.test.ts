import { describe, expect, it, vi } from "vitest";

describe("checkout API call", () => {
  it("should call checkout API", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ url: "test-url" }),
      } as Response)
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetch("/api/create-checkout");
    expect(fetchMock).toHaveBeenCalledWith("/api/create-checkout");

    vi.unstubAllGlobals();
  });
});
