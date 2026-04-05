import { useEffect, useState } from "react";
import { getContextOptions } from "@/lib/context";

/**
 * `true` = GET /api/context/options returned ≥1 org; `false` = zero orgs;
 * `null` = loading or request failed (treat as unknown).
 */
export function useTenantWorkspaceLinked(): boolean | null {
  const [linked, setLinked] = useState<boolean | null>(null);

  useEffect(() => {
    void getContextOptions()
      .then((data) => setLinked(data.organizations.length > 0))
      .catch(() => setLinked(null));
  }, []);

  return linked;
}
