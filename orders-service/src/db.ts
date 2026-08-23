import pg from "pg";

/**
 * Connection pool for the orders database.
 *
 * `statement_timeout` caps how long the server will spend executing a single
 * statement. `connectionTimeoutMillis` caps how long we wait for a pooled
 * client before giving up.
 */
export const pool = new pg.Pool({
  host: process.env.PGHOST ?? "localhost",
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? "postgres",
  password: process.env.PGPASSWORD ?? "postgres",
  database: process.env.PGDATABASE ?? "orders",
  max: 10,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 2_000,
  statement_timeout: 1_000,
});
