import { ComingSoonDemo } from "@/components/coming-soon-demo";

export const metadata = {
  title: "Coming soon",
};

export default function ComingSoonPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="stack-sm">
        <h1 className="heading-page">Coming soon</h1>
        <p className="text-body">Illustrative demo metrics — not connected to live data.</p>
      </div>
      <ComingSoonDemo />
    </div>
  );
}
