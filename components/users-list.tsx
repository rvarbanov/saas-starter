"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { Component, type ReactNode } from "react";
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
import { isConvexConfigured } from "@/lib/convex-config";

const COLUMN_HEADERS = ["First name", "Last name", "Email", "Created at", "Updated at"] as const;
const SKELETON_ROW_IDS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"] as const;

const listedUserDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatListedUserDate(ms: number): string {
  return listedUserDateFormatter.format(new Date(ms));
}

export function usersListErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }
  return "Something went wrong";
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

class UsersListErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown): { error: unknown } {
    return { error };
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

function UsersListEmpty() {
  return (
    <UsersTableShell>
      <TableRow>
        <TableCell className="text-muted-foreground" colSpan={COLUMN_HEADERS.length}>
          No users found
        </TableCell>
      </TableRow>
    </UsersTableShell>
  );
}

function ListedUserRow({ user }: { user: ListUser }) {
  return (
    <TableRow>
      <EllipsisCell value={user.firstName ?? ""} />
      <EllipsisCell value={user.lastName ?? ""} />
      <EllipsisCell value={user.email} />
      <EllipsisCell value={formatListedUserDate(user.createdAt)} />
      <EllipsisCell value={formatListedUserDate(user.updatedAt)} />
    </TableRow>
  );
}

function UsersListInner() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const ready = !authLoading && isAuthenticated;
  const result = useQuery(
    api.users.list,
    ready
      ? {
          paginationOpts: { numItems: LIST_USERS_PAGE_SIZE, cursor: null },
        }
      : "skip",
  );

  if (!ready || result === undefined) {
    return <UsersListSkeleton />;
  }

  if (result.page.length === 0) {
    return <UsersListEmpty />;
  }

  return (
    <UsersTableShell>
      {result.page.map((user) => (
        <ListedUserRow key={user._id} user={user} />
      ))}
    </UsersTableShell>
  );
}

/** Users list table for `/dashboard/users`. First page of 25 only. */
export function UsersList() {
  if (!isConvexConfigured()) {
    return <p className="text-caption">Convex is not configured; the Users list cannot load.</p>;
  }

  return (
    <UsersListErrorBoundary>
      <UsersListInner />
    </UsersListErrorBoundary>
  );
}
