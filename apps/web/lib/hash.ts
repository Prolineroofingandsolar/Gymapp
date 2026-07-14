import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";

export function hashPassword(password: string, salt?: string): string {
  const s = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, s, 32).toString("hex");
  return `${s}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 32);
  return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}

const SIGNING_SECRET = process.env.CADENCE_SECRET ?? "local-dev-secret-change-in-production";

/** Signed tokens for QR check-in links: payload.signature */
export function signToken(payload: string): string {
  const sig = createHmac("sha256", SIGNING_SECRET).update(payload).digest("hex").slice(0, 24);
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyToken(token: string): string | null {
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const payload = Buffer.from(b64, "base64url").toString();
  const expected = createHmac("sha256", SIGNING_SECRET).update(payload).digest("hex").slice(0, 24);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return payload;
}
