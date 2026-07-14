import { redirect } from "next/navigation";
import { getCurrentUser, getCtx, homeFor } from "@/lib/auth";
import { CreateGymForm } from "@/components/AuthForms";

export default async function GymOnboarding() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const ctx = await getCtx();
  if (ctx) redirect(homeFor(ctx.membership.role));
  return (
    <main className="max-w-md mx-auto px-6 py-14 space-y-6">
      <h1 className="text-2xl font-bold">Set up your gym</h1>
      <p className="text-sm text-slate-500">
        Three fields and you're in. You'll build your timetable and invite your team from the dashboard.
      </p>
      <CreateGymForm />
    </main>
  );
}
