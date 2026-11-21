import { PGlite } from '@electric-sql/pglite';
import { type PGliteWithLive, live } from '@electric-sql/pglite/live';
import { identifier } from '@electric-sql/pglite/template';

import { PGLITE_PARSERS } from '$lib/db/parsers';
import { applyLocalSchema } from '$lib/db/schemas';

export interface ILoggedChange {
	table_name: string;
	operation: 'insert' | 'update' | 'delete';
	primary_key: Record<string, unknown>;
	value: Record<string, unknown> | null;
	write_id: string;
}

/*
 * In-memory PGlite with the app's local schema: what DBStore creates, without IndexedDB and sync.
 */
export const createLocalDB = async (): Promise<PGliteWithLive> => {
	const db: PGliteWithLive = await PGlite.create({
		extensions: { live },
		parsers: PGLITE_PARSERS
	});

	await applyLocalSchema(db);

	return db;
};

/*
 * The change log in write order.
 */
export const readChangeLog = async (db: PGliteWithLive): Promise<ILoggedChange[]> =>
	(
		await db.query<ILoggedChange>(
			'SELECT table_name, operation, primary_key, value, write_id FROM changes ORDER BY id'
		)
	).rows;

/*
 * Rows arriving from the server, the way RealtimeSync writes them.
 */
export const syncIn = (
	db: PGliteWithLive,
	table: 'collections' | 'lyubo' | 'tags' | 'lyubo_tags',
	rows: object[]
) => db.sql`SELECT ${identifier`${table}_synced_upsert`}(${JSON.stringify(rows)}::jsonb)`;
