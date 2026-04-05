const KEY = "astraops_simulation_mode";

export function isSimulationModeEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setSimulationModeEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(KEY, enabled ? "1" : "0");
    window.dispatchEvent(new Event("zorvexa:simulation-mode"));
  } catch {
    // ignore
  }
}
