import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import "dotenv/config"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const password = await bcrypt.hash("admin123", 10)
  const user = await prisma.user.upsert({
    where: { email: "admin@admanager.com" },
    update: {},
    create: { name: "Admin", email: "admin@admanager.com", password, role: "CEO" },
  })
  console.log("Seeded CEO:", user.email, "/ password: admin123")
}

main().catch(console.error).finally(() => prisma.$disconnect())
