/**
 * Database Layer Entrypoint (Memory Lane, User Sessions, Story Bank & Reel History)
 * Ready for database client & schema integration.
 */

export interface DatabaseConfig {
  provider: "sqlite" | "postgres" | "supabase" | "local-json";
  connectionUrl?: string;
}

export const defaultDbConfig: DatabaseConfig = {
  provider: "local-json",
};

