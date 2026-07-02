import { Pool, type QueryResultRow, type PoolClient } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Without a listener, an idle-client error (e.g. dropped connection) throws unhandled and
// crashes the Node process — pg.Pool emits 'error' on the pool itself for this case.
pool.on('error', (err) => {
    console.error('[db] unexpected error on idle client:', err);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
) {
    return pool.query<T>(text, params);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
