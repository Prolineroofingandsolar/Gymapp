import { requireCtx } from "@/lib/auth";
import { signToken } from "@/lib/hash";
import { Shell } from "@/components/Shell";
import QRCode from "qrcode";
import { headers } from "next/headers";

export default async function CheckinPage() {
  const ctx = await requireCtx();
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  // Token is date-scoped: yesterday's screenshot won't check anyone in tomorrow.
  const token = signToken(`${ctx.membership.id}:${new Date().toISOString().slice(0, 10)}`);
  const url = `${proto}://${host}/attend/${token}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 260 });

  return (
    <Shell ctx={ctx} active="/checkin">
      <div className="max-w-sm mx-auto text-center space-y-5">
        <h1 className="text-2xl font-bold">Check in</h1>
        <p className="text-sm text-slate-500">
          Show this to a coach or the front desk — any staff phone camera can scan it.
          Or just tap your name on the kiosk at the door.
        </p>
        <div className="card p-6 inline-block" role="img" aria-label="Your personal check-in QR code"
          dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="text-xs text-slate-400">Code refreshes daily · {ctx.user.full_name}</p>
      </div>
    </Shell>
  );
}
