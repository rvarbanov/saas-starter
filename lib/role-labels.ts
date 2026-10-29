import type { Role } from "@/convex/lib/roles";

export const ROLE_LABELS: Record<Role, string> = {
  SYS_ADM: "System admin",
  USR_ADM: "Users admin",
  USR_MGR: "Users manager",
  USR_VWR: "Users viewer",
};

export function formatRoleLabels(roles: readonly Role[] | undefined): string {
  const labels = (roles ?? []).map((role) => ROLE_LABELS[role]);
  if (labels.length === 0) {
    return "None";
  }
  return labels.join(", ");
}
