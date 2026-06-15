import { getDatabase } from "./client";
import { schemaStatements } from "./schema";

export async function migrateDatabase(): Promise<void> {
  const db = await getDatabase();

  await db.execute("PRAGMA foreign_keys = ON");

  for (const statement of schemaStatements) {
    await db.execute(statement);
  }
}
