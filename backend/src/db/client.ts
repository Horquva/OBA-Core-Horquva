// =============================================================================
// Horquva Continuity Platform — PostgreSQL Database Client & Crypto Store
// =============================================================================
// Greenfield connection pool, transaction management, and AES-256 pgcrypto
// encryption for connector credentials at rest.
// =============================================================================

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const masterSecretKey = process.env.HORQUVA_SECRET_KEY || 'horquva-default-dev-secret-key-32b!';

export const pool = new Pool(
  databaseUrl
    ? { connectionString: databaseUrl }
    : {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        database: process.env.PGDATABASE || 'horquva_continuity',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
);

/**
 * Executes a parameterized SQL query against the connection pool.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', { text, error });
    throw error;
  }
}

/**
 * Executes a function within an isolated PostgreSQL transaction.
 * Automatically rolls back on error and commits on success.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Stores encrypted connection configuration in the database using pgcrypto AES-256.
 */
export async function storeEncryptedConnection(
  id: string,
  type: string,
  name: string,
  plainConfig: Record<string, any>
): Promise<void> {
  const configJson = JSON.stringify(plainConfig);
  await query(
    `
    INSERT INTO connection (id, type, name, config_encrypted, status, updated_at)
    VALUES ($1, $2, $3, horquva_encrypt_secret($4, $5), 'connected', NOW())
    ON CONFLICT (id) DO UPDATE SET
      type = EXCLUDED.type,
      name = EXCLUDED.name,
      config_encrypted = EXCLUDED.config_encrypted,
      status = EXCLUDED.status,
      updated_at = NOW();
    `,
    [id, type, name, configJson, masterSecretKey]
  );
}

/**
 * Retrieves and decrypts connection configuration using pgcrypto AES-256.
 */
export async function retrieveDecryptedConnection(
  id: string
): Promise<{ id: string; type: string; name: string; config: Record<string, any>; status: string } | null> {
  const res = await query(
    `
    SELECT id, type, name, horquva_decrypt_secret(config_encrypted, $1) as config_plain, status
    FROM connection
    WHERE id = $2;
    `,
    [masterSecretKey, id]
  );

  if (res.rows.length === 0) {
    return null;
  }

  const row = res.rows[0];
  let config: Record<string, any> = {};
  if (row.config_plain) {
    try {
      config = JSON.parse(row.config_plain);
    } catch (e) {
      console.error('Failed to parse decrypted config JSON for connection:', id, e);
    }
  }

  return {
    id: row.id,
    type: row.type,
    name: row.name,
    config,
    status: row.status,
  };
}

/**
 * Gracefully shuts down the connection pool (for test cleanup and process shutdown).
 */
export async function closePool(): Promise<void> {
  await pool.end();
}
