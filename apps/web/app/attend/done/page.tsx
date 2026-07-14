import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { Shell } from "@/components/Shell";

export default async function AttendDone() {
  const ctx = await requireStaff();
  return (
    <Shell ctx={ctx} active="/coach">
      <div className="max-w-sm mx-auto text-center space-y-4 pt-10">
        <p className="text-5xl">✅</p>
        <h1 className="text-2xl font-bold">Checked in</h1>
        <p className="text-sm text-slate-500">Attendance recorded via QR.</p>
        <Link href="/coach" className="btn-accent">Back to today</Link>
      </div>
    </Shell>
  );
}
