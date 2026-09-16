import { UserDetail } from "@/components/user-detail";

export const metadata = {
  title: "User",
};

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <UserDetail userId={userId} />;
}
