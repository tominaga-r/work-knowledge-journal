import Database from "@tauri-apps/plugin-sql";

const DATABASE_URL = "sqlite:work-knowledge-journal.db";

let database: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (database) {
    return database;
  }

  database = await Database.load(DATABASE_URL);
  return database;
}
