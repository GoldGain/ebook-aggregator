
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./drizzle/schema";
import { desc, sql } from "drizzle-orm";

const databaseUrl = "postgresql://postgres.syohxjnbumfllsyqmexa:%23Martin89269248.@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?sslmode=require";

async function test() {
  console.log("Connecting to database...");
  const client = postgres(databaseUrl, { ssl: "require", prepare: false });
  const db = drizzle(client, { schema });

  try {
    console.log("Fetching book count...");
    const countResult = await db.select({ count: sql`count(*)` }).from(schema.books);
    console.log("Book count:", countResult);

    console.log("Fetching recent books...");
    const recent = await db.select().from(schema.books).orderBy(desc(schema.books.importedAt)).limit(5);
    console.log("Recent books count:", recent.length);
    if (recent.length > 0) {
      console.log("First recent book:", recent[0].title);
    }

    console.log("Searching for 'Siku Njema'...");
    const search = await db.select().from(schema.books).where(sql`title ILIKE '%Siku Njema%'`).limit(5);
    console.log("Search results count:", search.length);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

test();
