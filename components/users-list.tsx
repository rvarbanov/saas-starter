"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { Component, type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { ListUser } from "@/convex/lib/listUser";
import { LIST_USERS_PAGE_SIZE } from "@/convex/lib/pagination";
import { ROLE_VALUES, type Role } from "@/convex/lib/roles";
import { isConvexConfigured } from "@/lib/convex-config";

const COLUMN_HEADERS = [
  "First name",
  "Last name",
  "Email",
  "Roles",
  "Created at",
  "Updated at",
] as const;
const SKELETON_ROW_IDS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"] as const;
const CREATED_WITHIN_PRESETS = [7, 30, 90] as const;
type CreatedWithinDays = (typeof CREATED_WITHIN_PRESETS)[number];

const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super admin",
  manager: "Manager",
  team_member: "Team member",
};

const listedUserDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatListedUserDate(ms: number): string {
  return listedUserDateFormatter.format(new Date(ms));
}

export function formatListedUserRoles(roles: readonly Role[] | undefined): string {
  return (roles ?? []).map((role) => ROLE_LABELS[role]).join(", ");
}

export function usersListErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }
  return "Something went wrong";
}

/** Empty-state copy when the directory has no rows (virgin vs constrained). */
export const USERS_LIST_EMPTY_VIRGIN = "No users found";
export const USERS_LIST_EMPTY_CONSTRAINED = "No users match";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function EllipsisCell({ value }: { value: string }) {
  return (
    <TableCell className="max-w-48 truncate" title={value}>
      {value}
    </TableCell>
  );
}

function UsersTableShell({ children }: { children: ReactNode }) {
  return (
    <div className="w-full" data-testid="users-directory-table">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMN_HEADERS.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

class UsersListErrorBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { error: unknown }
> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown): { error: unknown } {
    return { error };
  }

  override componentDidUpdate(prevProps: Readonly<{ resetKey: string }>): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error != null) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      return <p className="text-body">{usersListErrorMessage(this.state.error)}</p>;
    }
    return this.props.children;
  }
}

function UsersListSkeleton() {
  return (
    <UsersTableShell>
      {SKELETON_ROW_IDS.map((rowId) => (
        <TableRow key={rowId}>
          {COLUMN_HEADERS.map((header) => (
            <TableCell key={header}>
              <Skeleton className="h-4 w-24" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </UsersTableShell>
  );
}

function UsersListEmpty({ constrained }: { constrained: boolean }) {
  return (
    <UsersTableShell>
      <TableRow>
        <TableCell className="text-muted-foreground" colSpan={COLUMN_HEADERS.length}>
          {constrained ? USERS_LIST_EMPTY_CONSTRAINED : USERS_LIST_EMPTY_VIRGIN}
        </TableCell>
      </TableRow>
    </UsersTableShell>
  );
}

function ListedUserRow({ user }: { user: ListUser }) {
  const rolesLabel = formatListedUserRoles(user.roles);
  return (
    <TableRow>
      <EllipsisCell value={user.firstName ?? ""} />
      <EllipsisCell value={user.lastName ?? ""} />
      <EllipsisCell value={user.email} />
      <EllipsisCell value={rolesLabel} />
      <EllipsisCell value={formatListedUserDate(user.createdAt)} />
      <EllipsisCell value={formatListedUserDate(user.updatedAt)} />
    </TableRow>
  );
}

function UsersListToolbar({
  search,
  onSearchChange,
  selectedRoles,
  onToggleRole,
  createdWithinDays,
  onCreatedWithinDaysChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  selectedRoles: Role[];
  onToggleRole: (role: Role) => void;
  createdWithinDays: CreatedWithinDays | undefined;
  onCreatedWithinDaysChange: (value: CreatedWithinDays | undefined) => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3" data-testid="users-directory-toolbar">
      <Input
        aria-label="Search users"
        data-testid="users-search-input"
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search name or email"
        type="search"
        value={search}
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Roles</span>
        {ROLE_VALUES.map((role) => {
          const selected = selectedRoles.includes(role);
          return (
            <Button
              aria-pressed={selected}
              data-testid={`users-role-filter-${role}`}
              key={role}
              onClick={() => onToggleRole(role)}
              size="sm"
              type="button"
              variant={selected ? "default" : "outline"}
            >
              {ROLE_LABELS[role]}
            </Button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Created</span>
        <Button
          aria-pressed={createdWithinDays === undefined}
          data-testid="users-created-filter-all"
          onClick={() => onCreatedWithinDaysChange(undefined)}
          size="sm"
          type="button"
          variant={createdWithinDays === undefined ? "default" : "outline"}
        >
          All
        </Button>
        {CREATED_WITHIN_PRESETS.map((days) => {
          const selected = createdWithinDays === days;
          return (
            <Button
              aria-pressed={selected}
              data-testid={`users-created-filter-${days}d`}
              key={days}
              onClick={() => onCreatedWithinDaysChange(days)}
              size="sm"
              type="button"
              variant={selected ? "default" : "outline"}
            >
              {days}d
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function UsersListInner() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const ready = !authLoading && isAuthenticated;

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [createdWithinDays, setCreatedWithinDays] = useState<CreatedWithinDays | undefined>(
    undefined,
  );

  const trimmedSearch = debouncedSearch.trim();
  const activeSearch = trimmedSearch.length >= 2 ? trimmedSearch : undefined;
  const activeRoles = selectedRoles.length > 0 ? selectedRoles : undefined;
  const constrained =
    activeSearch !== undefined || activeRoles !== undefined || createdWithinDays !== undefined;

  const result = useQuery(
    api.users.list,
    ready
      ? {
          paginationOpts: { numItems: LIST_USERS_PAGE_SIZE, cursor: null },
          ...(activeSearch !== undefined ? { search: activeSearch } : {}),
          ...(activeRoles !== undefined ? { roles: activeRoles } : {}),
          ...(createdWithinDays !== undefined ? { createdWithinDays } : {}),
        }
      : "skip",
  );

  const toggleRole = (role: Role) => {
    setSelectedRoles((current) =>
      current.includes(role) ? current.filter((value) => value !== role) : [...current, role],
    );
  };

  const filterResetKey = [
    activeSearch ?? "",
    (activeRoles ?? []).join(","),
    createdWithinDays ?? "",
  ].join("|");

  return (
    <UsersListErrorBoundary resetKey={filterResetKey}>
      <div>
        <UsersListToolbar
          createdWithinDays={createdWithinDays}
          onCreatedWithinDaysChange={setCreatedWithinDays}
          onSearchChange={setSearchInput}
          onToggleRole={toggleRole}
          search={searchInput}
          selectedRoles={selectedRoles}
        />
        {!ready || result === undefined ? (
          <UsersListSkeleton />
        ) : result.page.length === 0 ? (
          <UsersListEmpty constrained={constrained} />
        ) : (
          <UsersTableShell>
            {result.page.map((user) => (
              <ListedUserRow key={user._id} user={user} />
            ))}
          </UsersTableShell>
        )}
      </div>
    </UsersListErrorBoundary>
  );
}

/** Users list table for `/dashboard/users`. First page of 25 only; search/filter supported. */
export function UsersList() {
  if (!isConvexConfigured()) {
    return <p className="text-caption">Convex is not configured; the Users list cannot load.</p>;
  }

  return <UsersListInner />;
}
