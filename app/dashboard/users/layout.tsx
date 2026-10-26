import { UsersAccessGate } from "@/components/users-access-gate";

export default function UsersLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <UsersAccessGate>{children}</UsersAccessGate>;
}
