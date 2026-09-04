// Small presentation helpers. Status/role literals arrive from the API as plain
// strings, so these tolerate any string.

export function formatAmount(cents: number | null | undefined): string {
  const n = typeof cents === "number" ? cents : 0;
  return (n / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatTime(epochms: number | null | undefined): string {
  if (!epochms) return "";
  return new Date(epochms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function roleLabel(role: string | null | undefined): string {
  switch (role) {
    case "ops_agent":
      return "Ops Agent";
    case "supervisor":
      return "Supervisor";
    case "viewer":
      return "Viewer";
    default:
      return role ?? "—";
  }
}

// The forward path of the lifecycle, for the state rail.
export const LIFECYCLE = ["received", "validated", "allocated", "fulfilled"] as const;
