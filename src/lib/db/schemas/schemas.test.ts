import type { PGliteWithLive } from '@electric-sql/pglite/live';
import { identifier } from '@electric-sql/pglite/template';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	LYUBO_ID,
	OTHER_LYUBO_ID,
	TAG_ID,
	createLocalDB,
	readChangeLog,
	serverLyubo,
	serverTag,
	syncIn
} from '$lib/testing';

let db: PGliteWithLive;

const localWriteId = async (table: 'lyubo_local' | 'tags_local', id = LYUBO_ID) =>
	(
		await db.sql<{
			write_id: string;
		}>`SELECT write_id FROM ${identifier`${table}`} WHERE id = ${id}`
	).rows[0]?.write_id;
const relationWriteId = async () =>
	(
		await db.sql<{ write_id: string }>`
			SELECT write_id FROM lyubo_tags_local WHERE lyubo_id = ${LYUBO_ID} AND tag_id = ${TAG_ID}
		`
	).rows[0]?.write_id;
const lyuboName = async () =>
	(await db.sql<{ name: string }>`SELECT name FROM lyubo WHERE id = ${LYUBO_ID}`).rows[0]?.name;

describe('local schema', () => {
	beforeEach(async () => {
		db = await createLocalDB();
	});

	afterEach(async () => {
		await db.close();
	});

	describe('change log', () => {
		it('logs an insert with the write_id of the local row', async () => {
			await db.sql`INSERT INTO lyubo (id, name) VALUES (${LYUBO_ID}, 'a')`;

			const [change] = await readChangeLog(db);

			expect(change).toMatchObject({ table_name: 'lyubo', operation: 'insert' });
			expect(change.value).toMatchObject({ id: LYUBO_ID, name: 'a' });
			expect(change.write_id).toBe(await localWriteId('lyubo_local'));
		});

		it('logs an edit of a synced row as an update with only the changed column', async () => {
			await syncIn(db, 'lyubo', [serverLyubo({ name: 'server' })]);

			await db.sql`UPDATE lyubo SET rating = 7 WHERE id = ${LYUBO_ID}`;

			const log = await readChangeLog(db);

			expect(log).toHaveLength(1);
			expect(log[0]).toMatchObject({ operation: 'update', value: { rating: 7 } });
			expect(log[0].write_id).toBe(await localWriteId('lyubo_local'));
		});

		it('logs nothing for an update that changes nothing', async () => {
			await syncIn(db, 'lyubo', [serverLyubo({ name: 'same' })]);

			await db.sql`UPDATE lyubo SET name = 'same' WHERE id = ${LYUBO_ID}`;

			expect(await readChangeLog(db)).toHaveLength(0);
		});

		it('logs a delete of a synced row with only its primary key', async () => {
			await syncIn(db, 'lyubo', [serverLyubo()]);

			await db.sql`DELETE FROM lyubo WHERE id = ${LYUBO_ID}`;

			expect(await readChangeLog(db)).toMatchObject([
				{ operation: 'delete', primary_key: { id: LYUBO_ID }, value: null }
			]);
		});

		it('logs every edit of a tag, recomputing its changed columns', async () => {
			await syncIn(db, 'tags', [serverTag({ name: 'old' })]);

			await db.sql`UPDATE tags SET name = 'new' WHERE id = ${TAG_ID}`;
			await db.sql`UPDATE tags SET created_at = '2020-01-01T00:00:00Z' WHERE id = ${TAG_ID}`;

			const { rows } = await db.sql<{ name: string; created_at: Date }>`
				SELECT name, created_at FROM tags WHERE id = ${TAG_ID}
			`;

			expect(rows[0].name).toBe('new');
			expect(rows[0].created_at.toISOString()).toBe('2020-01-01T00:00:00.000Z');
			expect(await readChangeLog(db)).toMatchObject([
				{ operation: 'update', value: { name: 'new' } },
				{ operation: 'update', value: { created_at: '2020-01-01T00:00:00+00:00' } }
			]);
		});

		it('logs tag assignments and unassignments, including of synced relations', async () => {
			const pk = { lyubo_id: LYUBO_ID, tag_id: TAG_ID };

			// Same statement as assignRelation()
			await db.sql`
				INSERT INTO lyubo_tags (lyubo_id, tag_id) VALUES (${LYUBO_ID}, ${TAG_ID})
				ON CONFLICT DO NOTHING
			`;
			await syncIn(db, 'lyubo_tags', [{ ...pk, write_id: await relationWriteId() }]);

			await db.sql`DELETE FROM lyubo_tags WHERE lyubo_id = ${LYUBO_ID} AND tag_id = ${TAG_ID}`;

			expect(await readChangeLog(db)).toMatchObject([
				{ table_name: 'lyubo_tags', operation: 'insert', primary_key: pk },
				{ table_name: 'lyubo_tags', operation: 'delete', primary_key: pk }
			]);
		});
	});

	describe('merged view', () => {
		it('hides a deleted synced row until the server deletes it', async () => {
			await syncIn(db, 'lyubo', [serverLyubo()]);

			await db.sql`DELETE FROM lyubo WHERE id = ${LYUBO_ID}`;

			expect((await db.sql`SELECT 1 FROM lyubo WHERE id = ${LYUBO_ID}`).rows).toHaveLength(0);
			expect(await localWriteId('lyubo_local')).toBeDefined();
		});

		it('leaves no tombstone when a row that never synced is deleted', async () => {
			await db.sql`INSERT INTO lyubo (id) VALUES (${LYUBO_ID})`;

			await db.sql`DELETE FROM lyubo WHERE id = ${LYUBO_ID}`;

			expect(await localWriteId('lyubo_local')).toBeUndefined();
			expect((await readChangeLog(db)).map((c) => c.operation)).toEqual(['insert', 'delete']);
		});

		it('keeps a newer local write when an older one syncs back', async () => {
			await db.sql`INSERT INTO lyubo (id, name) VALUES (${LYUBO_ID}, 'a')`;
			const firstWrite = await localWriteId('lyubo_local');
			await db.sql`UPDATE lyubo SET name = 'b' WHERE id = ${LYUBO_ID}`;

			await syncIn(db, 'lyubo', [serverLyubo({ name: 'a', write_id: firstWrite })]);

			expect(await lyuboName()).toBe('b');
		});

		it('shows a server update of a row this client wrote, once its write synced back', async () => {
			await db.sql`INSERT INTO lyubo (id, name) VALUES (${LYUBO_ID}, 'mine')`;
			await syncIn(db, 'lyubo', [
				serverLyubo({ name: 'mine', write_id: await localWriteId('lyubo_local') })
			]);

			await syncIn(db, 'lyubo', [serverLyubo({ name: 'theirs' })]);

			expect(await lyuboName()).toBe('theirs');
		});
	});

	describe('cleanup on sync', () => {
		it('drops the local row when its own write syncs back, without logging a delete', async () => {
			await db.sql`INSERT INTO lyubo (id, name) VALUES (${LYUBO_ID}, 'a')`;
			const writeId = await localWriteId('lyubo_local');

			await syncIn(db, 'lyubo', [serverLyubo({ name: 'a', write_id: writeId })]);

			expect(await localWriteId('lyubo_local')).toBeUndefined();
			expect((await readChangeLog(db)).map((c) => c.operation)).toEqual(['insert']);
		});

		it('drops the tombstone once the server deletes the row', async () => {
			await syncIn(db, 'lyubo', [serverLyubo()]);
			await db.sql`DELETE FROM lyubo WHERE id = ${LYUBO_ID}`;

			await db.sql`SELECT lyubo_synced_remove(${JSON.stringify([{ id: LYUBO_ID }])}::jsonb)`;

			expect(await localWriteId('lyubo_local')).toBeUndefined();
		});
	});

	describe('synced functions', () => {
		it('replaces a whole synced table from a complete result, logging nothing', async () => {
			await syncIn(db, 'lyubo', [serverLyubo(), serverLyubo({ id: OTHER_LYUBO_ID })]);

			await db.sql`SELECT lyubo_synced_retain(${JSON.stringify([{ id: LYUBO_ID }])}::jsonb)`;

			const { rows } = await db.sql<{ id: string }>`SELECT id FROM lyubo_synced`;

			expect(rows.map((r) => r.id)).toEqual([LYUBO_ID]);
			expect(await readChangeLog(db)).toHaveLength(0);
		});
	});
});
