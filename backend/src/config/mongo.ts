import { MongoClient } from "mongodb";

let client: MongoClient | null = null;

export function mongoEnabled(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MongoDB not configured. Set MONGODB_URI to enable Workflows + Deploy without Postgres."
    );
  }
  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? 8000),
  });
  await client.connect();
  return client;
}

export async function getMongoDb() {
  const c = await getMongoClient();
  const dbName = process.env.MONGODB_DB ?? "quantumops";
  return c.db(dbName);
}

