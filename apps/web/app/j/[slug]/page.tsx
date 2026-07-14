import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { JoinForm } from "@/components/AuthForms";

const ROLE_COPY: Record<string, string> = {
  member: "as a member",
  trial: "for a trial",
  dropin: "as a drop-in visitor",
  coach: "as a coach",
  head_coach: "as head coach",
  admin: "as an administrator",
};

export default async function JoinPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ r?: string }>;
}) {
  const { slug } = await params;
  const { r } = await searchParams;
  const role = r && ROLE_COPY[r] ? r : "member";
  const gym = getDb().prepare("select name, slug, accent from gyms where slug = ?").get(slug) as
    { name: string; slug: string; accent: string } | undefined;
  if (!gym) notFound();
  return (
    <main className="max-w-sm mx-auto px-6 py-14 space-y-6" style={{ ["--accent" as string]: gym.accent }}>
      <div className="space-y-1">
        <p className="text-sm text-slate-500">You've been invited to join {ROLE_COPY[role]}</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--accent)" }}>{gym.name}</h1>
      </div>
      <JoinForm slug={gym.slug} role={role} gymName={gym.name} />
    </main>
  );
}
