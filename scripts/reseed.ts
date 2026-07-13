// Wipes the local database and reseeds the Forge Fitness demo org.
// Usage: npm run seed
import fs from "node:fs";
import path from "node:path";

const dbPath = path.join(process.cwd(), "data", "corner.db");
for (const suffix of ["", "-wal", "-shm"]) {
  const p = dbPath + suffix;
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
console.log("Database wiped. It will re-seed with the Forge Fitness demo on next app start.");
