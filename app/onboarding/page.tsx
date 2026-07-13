import { redirect } from "next/navigation";
import { getCurrentUser, getCtx } from "@/lib/auth";
import { CreateOrgForm } from "@/components/AuthForms";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const ctx = await getCtx();
  if (ctx) redirect(ctx.member.role === "member" ? "/home" : "/radar");

  return (
    <main className="max-w-md mx-auto px-6 py-16 space-y-6">
      <h1 className="text-2xl font-bold">Set up your gym</h1>
      <p className="text-sm text-zinc-400">
        Two questions and you&apos;re in. You can add members with a shareable invite link or a CSV —
        Corner sits alongside your booking software, it doesn&apos;t replace it.
      </p>
      <CreateOrgForm />
    </main>
  );
}
