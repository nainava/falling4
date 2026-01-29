import { storage } from "./storage";

export async function seed() {
  const existing = await storage.getTopScores();
  if (existing.length === 0) {
    console.log("Seeding database...");
    await storage.createScore({ name: "AAA", score: 10000, level: 5 });
    await storage.createScore({ name: "BOB", score: 8000, level: 4 });
    await storage.createScore({ name: "CAT", score: 5000, level: 3 });
    await storage.createScore({ name: "DEV", score: 2000, level: 2 });
    await storage.createScore({ name: "EVE", score: 1000, level: 1 });
    console.log("Seeding complete!");
  }
}
