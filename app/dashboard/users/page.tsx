import { UsersList } from "@/components/users-list";

export const metadata = {
  title: "Users",
};

export default function UsersPage() {
  return (
    <div className="page-main">
      <h1 className="heading-page">Users</h1>
      <UsersList />
    </div>
  );
}
