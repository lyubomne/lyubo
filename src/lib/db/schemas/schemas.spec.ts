import { PGlite } from '@electric-sql/pglite';
import { identifier } from '@electric-sql/pglite/template';
import { beforeEach, describe, expect, it } from 'vitest';

import changesSchema from './changes.sql?raw';
import triggersSchema from './triggers.sql?raw';
import lyuboSchema from './lyubo.sql?raw';
import tagsSchema from './tags.sql?raw';
import lyuboTagsSchema from './lyubo_tags.sql?raw';
import lyuboWithTagsSchema from './lyubo_with_tags.sql?raw';

type TChange = {
	table_name: string;
	operation: string;
	primary_key: Record<string, unknown>;
	value: Record<string, unknown> | null;
	write_id: string;
};

const ID = '00000000-0000-4000-8000-000000000001';
const TAG = '00000000-0000-4000-8000-000000000002';
const SERVER_WRITE = '00000000-0000-4000-8000-0000000000ff';

let db: PGlite;

// Complete rows, as the server sends them
const serverLyubo = (overrides: Record<string, unknown>) => ({
	id: ID,
	name: '',
	rating: '0.0',
	review: '',
	favorite: false,
	watched_on: '2026-01-01',
	created_at: '2026-01-01T00:00:00.000Z',
	write_id: SERVER_WRITE,
	...overrides
});
const serverTag = (overrides: Record<string, unknown>) => ({
	id: TAG,
	name: '',
	created_at: '2026-01-01T00:00:00.000Z',
	write_id: SERVER_WRITE,
	...overrides
});

const changes = async () =>
	(
		await db.query<TChange>(
			'SELECT table_name, operation, primary_key, value, write_id FROM changes ORDER BY id'
		)
	).rows;
const localWriteId = async (table: 'lyubo_local' | 'tags_local') =>
	(
		await db.sql<{
			write_id: string;
		}>`SELECT write_id FROM ${identifier`${table}`} WHERE id = ${ID}`
	).rows[0]?.write_id;
const relationWriteId = async () =>
	(
		await db.sql<{ write_id: string }>`
			SELECT write_id FROM lyubo_tags_local WHERE lyubo_id = ${ID} AND tag_id = ${TAG}
		`
	).rows[0]?.write_id;
// What RealtimeSync does when a row arrives from the server
const syncIn = (table: 'lyubo' | 'tags' | 'lyubo_tags', rows: Record<string, unknown>[]) =>
	db.sql`SELECT ${identifier`${table}_synced_upsert`}(${JSON.stringify(rows)}::jsonb)`;

describe('local schema', () => {
	beforeEach(async () => {
		db = await PGlite.create();

		for (const schema of [
			changesSchema,
			triggersSchema,
			lyuboSchema,
			tagsSchema,
			lyuboTagsSchema,
			lyuboWithTagsSchema
		]) {
			await db.exec(schema);
		}
	});

	it('logs an insert with the write_id of the local row', async () => {
		await db.query(`INSERT INTO lyubo (id, name) VALUES ($1, 'a')`, [ID]);

		const [change] = await changes();

		expect(change).toMatchObject({ table_name: 'lyubo', operation: 'insert' });
		expect(change.value).toMatchObject({ id: ID, name: 'a' });
		expect(change.write_id).toBe(await localWriteId('lyubo_local'));
	});

	it('logs an edit of a synced row as an update with only the changed column', async () => {
		await syncIn('lyubo', [serverLyubo({ id: ID, name: 'server', write_id: SERVER_WRITE })]);
		await db.query(`UPDATE lyubo SET rating = 7 WHERE id = $1`, [ID]);

		const log = await changes();

		expect(log).toHaveLength(1);
		expect(log[0]).toMatchObject({ operation: 'update', value: { rating: 7 } });
		expect(log[0].write_id).toBe(await localWriteId('lyubo_local'));
	});

	it('logs nothing for an update that changes nothing', async () => {
		await syncIn('lyubo', [serverLyubo({ id: ID, name: 'same', write_id: SERVER_WRITE })]);
		await db.query(`UPDATE lyubo SET name = 'same' WHERE id = $1`, [ID]);

		expect(await changes()).toHaveLength(0);
	});

	it('drops the local row when its own write syncs back, without logging a delete', async () => {
		await db.query(`INSERT INTO lyubo (id, name) VALUES ($1, 'a')`, [ID]);
		const writeId = await localWriteId('lyubo_local');

		await syncIn('lyubo', [serverLyubo({ id: ID, name: 'a', write_id: writeId })]);

		expect(await localWriteId('lyubo_local')).toBeUndefined();
		expect((await changes()).map((c) => c.operation)).toEqual(['insert']);
	});

	it('keeps a newer local write when an older one syncs back', async () => {
		await db.query(`INSERT INTO lyubo (id, name) VALUES ($1, 'a')`, [ID]);
		const firstWrite = await localWriteId('lyubo_local');
		await db.query(`UPDATE lyubo SET name = 'b' WHERE id = $1`, [ID]);

		await syncIn('lyubo', [serverLyubo({ id: ID, name: 'a', write_id: firstWrite })]);

		const { rows } = await db.query<{ name: string }>(`SELECT name FROM lyubo WHERE id = $1`, [ID]);

		expect(rows[0].name).toBe('b');
	});

	it('shows a server update of a row this client wrote, once its write synced back', async () => {
		await db.query(`INSERT INTO lyubo (id, name) VALUES ($1, 'mine')`, [ID]);
		await syncIn('lyubo', [
			serverLyubo({ id: ID, name: 'mine', write_id: await localWriteId('lyubo_local') })
		]);
		await syncIn('lyubo', [serverLyubo({ id: ID, name: 'theirs', write_id: SERVER_WRITE })]);

		const { rows } = await db.query<{ name: string }>(`SELECT name FROM lyubo WHERE id = $1`, [ID]);

		expect(rows[0].name).toBe('theirs');
	});

	it('logs a delete of a synced row and hides it until the server deletes it', async () => {
		await syncIn('lyubo', [serverLyubo({ id: ID, write_id: SERVER_WRITE })]);
		await db.query(`DELETE FROM lyubo WHERE id = $1`, [ID]);

		expect(await changes()).toMatchObject([
			{ operation: 'delete', primary_key: { id: ID }, value: null }
		]);
		expect((await db.query(`SELECT 1 FROM lyubo WHERE id = $1`, [ID])).rows).toHaveLength(0);

		await db.query(`SELECT lyubo_synced_remove($1::jsonb)`, [JSON.stringify([{ id: ID }])]);

		expect(await localWriteId('lyubo_local')).toBeUndefined();
	});

	it('leaves no tombstone when a row that never synced is deleted', async () => {
		await db.query(`INSERT INTO lyubo (id) VALUES ($1)`, [ID]);
		await db.query(`DELETE FROM lyubo WHERE id = $1`, [ID]);

		expect((await changes()).map((c) => c.operation)).toEqual(['insert', 'delete']);
		expect(await localWriteId('lyubo_local')).toBeUndefined();
	});

	it('recomputes changed columns of a tag on every edit', async () => {
		await syncIn('tags', [serverTag({ id: TAG, name: 'old', write_id: SERVER_WRITE })]);
		await db.query(`UPDATE tags SET name = 'new' WHERE id = $1`, [TAG]);
		await db.query(`UPDATE tags SET created_at = '2020-01-01T00:00:00Z' WHERE id = $1`, [TAG]);

		const { rows } = await db.query<{ name: string; created_at: Date }>(
			`SELECT name, created_at FROM tags WHERE id = $1`,
			[TAG]
		);

		expect(rows[0].name).toBe('new');
		expect(rows[0].created_at.toISOString()).toBe('2020-01-01T00:00:00.000Z');
		expect((await changes()).map((c) => c.operation)).toEqual(['update', 'update']);
	});

	it('logs tag assignments and unassignments, including of synced relations', async () => {
		const pk = { lyubo_id: ID, tag_id: TAG };

		// Same statement as assignRelation()
		await db.query(
			`INSERT INTO lyubo_tags (lyubo_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			[ID, TAG]
		);
		await syncIn('lyubo_tags', [{ ...pk, write_id: await relationWriteId() }]);
		await db.query(`DELETE FROM lyubo_tags WHERE lyubo_id = $1 AND tag_id = $2`, [ID, TAG]);

		expect(await changes()).toMatchObject([
			{ table_name: 'lyubo_tags', operation: 'insert', primary_key: pk },
			{ table_name: 'lyubo_tags', operation: 'delete', primary_key: pk }
		]);

		const { rows } = await db.query(
			`SELECT 1 FROM lyubo_tags WHERE lyubo_id = $1 AND tag_id = $2`,
			[ID, TAG]
		);

		expect(rows).toHaveLength(0);
	});

	it('replaces a whole synced table from a complete result', async () => {
		const other = '00000000-0000-4000-8000-000000000003';

		await syncIn('lyubo', [
			serverLyubo({ id: ID, write_id: SERVER_WRITE }),
			serverLyubo({ id: other, write_id: SERVER_WRITE })
		]);
		await db.query(`SELECT lyubo_synced_retain($1::jsonb)`, [JSON.stringify([{ id: ID }])]);

		const { rows } = await db.query<{ id: string }>(`SELECT id FROM lyubo_synced`);

		expect(rows.map((r) => r.id)).toEqual([ID]);
		expect(await changes()).toHaveLength(0);
	});
});
