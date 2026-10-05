import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { normalizeRoles, type Role, uniqueRoles } from "./roles";

export const TRACKED_FIELDS = ["firstName", "lastName", "email", "roles"] as const;

export type TrackedFieldName = (typeof TRACKED_FIELDS)[number];

export type ChangeAction = "create" | "update" | "delete";

export type StoredFieldChange = {
  field: TrackedFieldName;
  before: string | null;
  after: string | null;
};

/** Names, email, and roles after the writers' normalizers. Unset matches missing. */
export type TrackedSnapshot = {
  firstName?: string;
  lastName?: string;
  email?: string;
  roles?: readonly Role[];
};

export type ChangeActor = { kind: "user"; userId: Id<"users"> } | { kind: "system" };

const FIELD_LABELS: Record<TrackedFieldName, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  roles: "Roles",
};

const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super admin",
  manager: "Manager",
  team_member: "Team member",
};

function storedName(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function storedEmail(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function storedRoles(roles: readonly Role[] | undefined): string | null {
  const unique = uniqueRoles(normalizeRoles(roles));
  if (unique.length === 0) {
    return null;
  }
  return unique.join(", ");
}

function pushIfDifferent(
  fields: StoredFieldChange[],
  field: TrackedFieldName,
  before: string | null,
  after: string | null,
) {
  if (before !== after) {
    fields.push({ field, before, after });
  }
}

/**
 * Tracked-field diff in display order. Only `firstName`, `lastName`, `email`,
 * and `roles` are compared. Blank names and missing names are the same value.
 */
export function diffTrackedFields(
  before: TrackedSnapshot,
  after: TrackedSnapshot,
): StoredFieldChange[] {
  const fields: StoredFieldChange[] = [];
  pushIfDifferent(fields, "firstName", storedName(before.firstName), storedName(after.firstName));
  pushIfDifferent(fields, "lastName", storedName(before.lastName), storedName(after.lastName));
  pushIfDifferent(fields, "email", storedEmail(before.email), storedEmail(after.email));
  pushIfDifferent(fields, "roles", storedRoles(before.roles), storedRoles(after.roles));
  return fields;
}

/** Leaf label for an App user: first + last, then email, then "User". */
export function appUserLeafLabel(user: {
  firstName?: string;
  lastName?: string;
  email?: string;
}): string {
  const full = [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean).join(" ");
  if (full) {
    return full;
  }
  const email = user.email?.trim();
  if (email) {
    return email;
  }
  return "User";
}

export function actorLabelFor(
  actorKind: "user" | "system",
  actor: { firstName?: string; lastName?: string; email?: string; deletedAt?: number } | null,
): string {
  if (actorKind === "system") {
    return "System";
  }
  if (!actor || actor.deletedAt !== undefined) {
    return "Deleted user";
  }
  return appUserLeafLabel(actor);
}

function formatStoredValue(field: TrackedFieldName, value: string | null): string {
  if (field === "roles") {
    if (value === null || value.trim().length === 0) {
      return "None";
    }
    return value
      .split(", ")
      .filter((part) => part.length > 0)
      .map((part) => ROLE_LABELS[part as Role] ?? part)
      .join(", ");
  }
  return value === null ? "—" : value;
}

export function formatChangeFields(
  fields: readonly StoredFieldChange[],
): Array<{ label: string; before: string; after: string }> {
  return fields.map((field) => ({
    label: FIELD_LABELS[field.field],
    before: formatStoredValue(field.field, field.before),
    after: formatStoredValue(field.field, field.after),
  }));
}

function resolveActor(actor: ChangeActor & { userId?: Id<"users"> }): ChangeActor {
  if (actor.kind === "user") {
    if (actor.userId === undefined) {
      throw new Error("User actor requires an App user id");
    }
    return { kind: "user", userId: actor.userId };
  }
  if (actor.userId !== undefined) {
    throw new Error("System actor must not include an App user id");
  }
  return { kind: "system" };
}

/**
 * Insert one Change in the caller's mutation, or return without inserting when
 * an update has no tracked-field diff. Create and delete store an empty `fields` array.
 */
export async function recordChange(
  ctx: MutationCtx,
  args: {
    subjectId: Id<"users">;
    action: ChangeAction;
    actor: ChangeActor;
    at: number;
    fields: StoredFieldChange[];
  },
): Promise<void> {
  const actor = resolveActor(args.actor);
  if (args.action === "update" && args.fields.length === 0) {
    return;
  }

  await ctx.db.insert("changes", {
    resourceKind: "app_user",
    subjectId: args.subjectId,
    action: args.action,
    actorKind: actor.kind,
    ...(actor.kind === "user" ? { actorUserId: actor.userId } : {}),
    at: args.at,
    fields: args.action === "update" ? args.fields : [],
  });
}
