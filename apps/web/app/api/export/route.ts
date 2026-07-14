import { getCtx } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callerFrom } from "@/lib/data/types";
import { exportMemberData } from "@/lib/data/members";

export async function GET() {
  const ctx = await getCtx();
  if (!ctx) return new Response("Sign in first", { status: 401 });
  const data = exportMemberData(getDb(), callerFrom(ctx));
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="cadence-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
