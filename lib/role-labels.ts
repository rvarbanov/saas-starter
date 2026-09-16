import type { Role } from "@/convex/lib/roles";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super admin",
  manager: "Manager",
  team_member: "Team member",
};

export function formatRoleLabels(roles: readonly Role[] | undefined): string {
  const labels = (roles ?? []).map((role) => ROLE_LABELS[role]);
  if (labels.length === 0) {
    return "None";
  }
  return labels.join(", ");
}
