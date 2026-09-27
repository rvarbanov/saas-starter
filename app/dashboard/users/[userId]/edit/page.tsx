import { EditUser } from "@/components/edit-user";

export const metadata = {
  title: "Edit user",
};

export default async function EditUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <EditUser userId={userId} />;
}
