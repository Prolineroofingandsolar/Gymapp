import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { JoinForm } from "@/components/AuthForms";

export default async function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const org = db.prepare("select name, slug, accent, house_rules from organizations where slug = ?")
    .get(slug) as { name: string; slug: string; accent: string; house_rules: string } | undefined;
  if (!org) notFound();

  return (
    <main className="max-w-sm mx-auto px-6 py-16 space-y-6" style={{ ["--accent" as string]: org.accent }}>
      <div className="space-y-2">
        <p className="text-sm text-zinc-500">You&apos;ve been invited to join</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--accent)" }}>{org.name}</h1>
        <p className="text-sm text-zinc-400">
          One 60-second check-in a week, a community feed, challenges and wins. That&apos;s it —
          no workout logging, no wearables.
        </p>
      </div>
      <JoinForm slug={org.slug} gymName={org.name} houseRules={org.house_rules} />
    </main>
  );
}
