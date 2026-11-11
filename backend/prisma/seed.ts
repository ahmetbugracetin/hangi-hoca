import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── Test users ───────────────────────────────────────────────────────────

const TEST_USERS = [
  { email: "test1@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_001" },
  { email: "test2@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_002" },
  { email: "test3@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_003" },
  { email: "test4@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_004" },
  { email: "test5@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_005" },
  { email: "test6@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_006" },
  { email: "test7@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_007" },
  { email: "test8@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_008" },
  { email: "e258043@metu.edu.tr", password: "Test1234!", studentIdHash: "hash_009" },
];

// Departments, instructors, courses and sections come from the SIS scraper
// (scraper/run.py). The seed only creates test users and never touches that
// data, so running it again does not wipe scraped data or add made-up sections.

export async function main() {
  console.log("Seeding database...");

  for (const u of TEST_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, passwordHash, studentIdHash: u.studentIdHash, isVerified: true },
    });
  }
  console.log(`  ${TEST_USERS.length} test kullanıcısı`);
  console.log("Seed tamamlandı! Bölüm/hoca/ders verisi için scraper'ı çalıştırın.");
}

main()
  .catch((e) => { console.error("Seed hatası:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
