import { ComingSoonDemo } from "@/components/coming-soon-demo";

export const metadata = {
  title: "Coming soon",
};

export default function ComingSoonPage() {
  return (
    <div className="content-area">
      <div className="stack-sm">
        <h1 className="heading-page">Coming soon</h1>
        <p className="text-body">Illustrative demo metrics — not connected to live data.</p>
      </div>
      <ComingSoonDemo />
    </div>
  );
}
