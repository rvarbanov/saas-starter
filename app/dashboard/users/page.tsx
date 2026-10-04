import { UsersList } from "@/components/users-list";

export const metadata = {
  title: "Users",
};

export default function UsersPage() {
  return (
    <div className="content-area">
      <h1 className="heading-page">Users</h1>
      <UsersList />
    </div>
  );
}
