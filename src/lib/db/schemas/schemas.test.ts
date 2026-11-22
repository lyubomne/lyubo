import { PGlite } from '@electric-sql/pglite';
import type { PGliteWithLive } from '@electric-sql/pglite/live';
import { identifier } from '@electric-sql/pglite/template';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCAL_SCHEMA_VERSION, applyLocalSchema } from '.';

import {
	COLLECTION_ID,
	LYUBO_ID,
	OTHER_COLLECTION_ID,
	OTHER_LYUBO_ID,
	OTHER_TAG_ID,
	TAG_ID,
	createLocalDB,
	readChangeLog,
	serverCollection,
	serverLyubo,
	serverTag,
	syncIn
} from '$lib/testing';

let db: PGliteWithLive;

const localWriteId = async (
	table: 'collections_local' | 'lyubo_local' | 'tags_local',
	id = LYUBO_ID
) =>
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
			await db.sql`INSERT INTO lyubo (id, collection_id, name) VALUES (${LYUBO_ID}, ${COLLECTION_ID}, 'a')`;

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

		describe('of collections', () => {
			const pk = { id: COLLECTION_ID };

			it('logs a new collection with its columns', async () => {
				await db.sql`INSERT INTO collections (id, name) VALUES (${COLLECTION_ID}, 'Films')`;

				expect(await readChangeLog(db)).toMatchObject([
					{
						table_name: 'collections',
						operation: 'insert',
						value: { ...pk, name: 'Films', position: 0, sort_column: null }
					}
				]);
			});

			it('logs an edit of a synced collection with only the changed columns', async () => {
				await syncIn(db, 'collections', [serverCollection()]);

				await db.sql`
					UPDATE collections SET sort_column = 'rating', sort_direction = 'asc'
					WHERE id = ${COLLECTION_ID}
				`;

				expect(await readChangeLog(db)).toMatchObject([
					{
						operation: 'update',
						primary_key: pk,
						value: { sort_column: 'rating', sort_direction: 'asc' }
					}
				]);
			});

			// The server's CHECK wants both or neither: a lone direction fails on a server row whose
			// sort another device has cleared
			it('logs both sort columns when only the direction changes', async () => {
				await syncIn(db, 'collections', [
					serverCollection({ sort_column: 'rating', sort_direction: 'asc' })
				]);

				await db.sql`UPDATE collections SET sort_direction = 'desc' WHERE id = ${COLLECTION_ID}`;

				expect((await readChangeLog(db)).map((change) => change.value)).toEqual([
					{ sort_column: 'rating', sort_direction: 'desc' }
				]);
			});

			it('logs a delete of a synced collection with only its primary key', async () => {
				await syncIn(db, 'collections', [serverCollection()]);

				await db.sql`DELETE FROM collections WHERE id = ${COLLECTION_ID}`;

				expect(await readChangeLog(db)).toMatchObject([
					{ operation: 'delete', primary_key: pk, value: null }
				]);
			});
		});

		it('logs the collection of a new record and tag', async () => {
			await db.sql`INSERT INTO lyubo (id, collection_id) VALUES (${LYUBO_ID}, ${COLLECTION_ID})`;
			await db.sql`INSERT INTO tags (id, collection_id) VALUES (${TAG_ID}, ${COLLECTION_ID})`;

			const log = await readChangeLog(db);

			expect(log.map((c) => c.value?.collection_id)).toEqual([COLLECTION_ID, COLLECTION_ID]);
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

	describe('tag names', () => {
		it('rejects a new tag that differs only in case from one of its collection, logging nothing', async () => {
			await syncIn(db, 'tags', [serverTag({ name: 'Drama' })]);

			const insert = db.sql`
				INSERT INTO tags (id, collection_id, name) VALUES (${OTHER_TAG_ID}, ${COLLECTION_ID}, 'drama')
			`;

			await expect(insert).rejects.toMatchObject({ code: '23505' });
			expect(await readChangeLog(db)).toEqual([]);
		});

		it('accepts a name that a tag of another collection has', async () => {
			await syncIn(db, 'tags', [serverTag({ name: 'Drama' })]);

			await db.sql`
				INSERT INTO tags (id, collection_id, name)
				VALUES (${OTHER_TAG_ID}, ${OTHER_COLLECTION_ID}, 'drama')
			`;

			expect(await readChangeLog(db)).toMatchObject([{ operation: 'insert' }]);
		});

		it('rejects renaming a tag to the name of another one, logging nothing', async () => {
			await syncIn(db, 'tags', [
				serverTag({ name: 'Drama' }),
				serverTag({ id: OTHER_TAG_ID, name: 'Comedy' })
			]);

			const rename = db.sql`UPDATE tags SET name = 'DRAMA' WHERE id = ${OTHER_TAG_ID}`;

			await expect(rename).rejects.toMatchObject({ code: '23505' });
			expect(await readChangeLog(db)).toEqual([]);
		});

		it('lets a tag change the case of its own name', async () => {
			await syncIn(db, 'tags', [serverTag({ name: 'drama' })]);

			await db.sql`UPDATE tags SET name = 'Drama' WHERE id = ${TAG_ID}`;

			expect(await readChangeLog(db)).toMatchObject([
				{ operation: 'update', value: { name: 'Drama' } }
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

		it('reads rated_on as the date string it stores, without a time zone', async () => {
			await syncIn(db, 'lyubo', [serverLyubo({ rated_on: '2026-03-01' })]);

			const { rows } = await db.sql<{ rated_on: unknown }>`
				SELECT rated_on FROM lyubo_with_tags WHERE id = ${LYUBO_ID}
			`;

			expect(rows[0].rated_on).toBe('2026-03-01');
		});

		it('shows a collection created locally until the server has it', async () => {
			await db.sql`INSERT INTO collections (id, name) VALUES (${COLLECTION_ID}, 'Films')`;

			const { rows } = await db.sql<{ name: string }>`SELECT name FROM collections`;

			expect(rows).toEqual([{ name: 'Films' }]);
		});

		it('leaves no tombstone when a row that never synced is deleted', async () => {
			await db.sql`INSERT INTO lyubo (id, collection_id) VALUES (${LYUBO_ID}, ${COLLECTION_ID})`;

			await db.sql`DELETE FROM lyubo WHERE id = ${LYUBO_ID}`;

			expect(await localWriteId('lyubo_local')).toBeUndefined();
			expect((await readChangeLog(db)).map((c) => c.operation)).toEqual(['insert', 'delete']);
		});

		it('shows the local sort of a collection as a pair when the server clears its sort', async () => {
			await syncIn(db, 'collections', [
				serverCollection({ sort_column: 'name', sort_direction: 'asc' })
			]);
			await db.sql`UPDATE collections SET sort_direction = 'desc' WHERE id = ${COLLECTION_ID}`;

			await syncIn(db, 'collections', [serverCollection()]);

			const { rows } = await db.sql`
				SELECT sort_column, sort_direction FROM collections WHERE id = ${COLLECTION_ID}
			`;
			expect(rows).toEqual([{ sort_column: 'name', sort_direction: 'desc' }]);
		});

		it('keeps a newer local write when an older one syncs back', async () => {
			await db.sql`INSERT INTO lyubo (id, collection_id, name) VALUES (${LYUBO_ID}, ${COLLECTION_ID}, 'a')`;
			const firstWrite = await localWriteId('lyubo_local');
			await db.sql`UPDATE lyubo SET name = 'b' WHERE id = ${LYUBO_ID}`;

			await syncIn(db, 'lyubo', [serverLyubo({ name: 'a', write_id: firstWrite })]);

			expect(await lyuboName()).toBe('b');
		});

		it('shows a server update of a row this client wrote, once its write synced back', async () => {
			await db.sql`INSERT INTO lyubo (id, collection_id, name) VALUES (${LYUBO_ID}, ${COLLECTION_ID}, 'mine')`;
			await syncIn(db, 'lyubo', [
				serverLyubo({ name: 'mine', write_id: await localWriteId('lyubo_local') })
			]);

			await syncIn(db, 'lyubo', [serverLyubo({ name: 'theirs' })]);

			expect(await lyuboName()).toBe('theirs');
		});
	});

	describe('cleanup on sync', () => {
		it('drops the local row when its own write syncs back, without logging a delete', async () => {
			await db.sql`INSERT INTO lyubo (id, collection_id, name) VALUES (${LYUBO_ID}, ${COLLECTION_ID}, 'a')`;
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

	describe('cleanup on sync of collections', () => {
		it('drops the local row when its own write syncs back', async () => {
			await db.sql`INSERT INTO collections (id, name) VALUES (${COLLECTION_ID}, 'Films')`;
			const writeId = await localWriteId('collections_local', COLLECTION_ID);

			await syncIn(db, 'collections', [serverCollection({ name: 'Films', write_id: writeId })]);

			expect(await localWriteId('collections_local', COLLECTION_ID)).toBeUndefined();
		});

		it('drops the tombstone once the server deletes the collection', async () => {
			await syncIn(db, 'collections', [serverCollection()]);
			await db.sql`DELETE FROM collections WHERE id = ${COLLECTION_ID}`;

			await db.sql`SELECT collections_synced_remove(${JSON.stringify([{ id: COLLECTION_ID }])}::jsonb)`;

			expect(await localWriteId('collections_local', COLLECTION_ID)).toBeUndefined();
		});
	});

	describe('deleting a collection', () => {
		it('drops its records, tags and relations that never synced, keeping their logged changes', async () => {
			await db.sql`INSERT INTO collections (id, name) VALUES (${COLLECTION_ID}, 'Films')`;
			await db.sql`INSERT INTO lyubo (id, collection_id) VALUES (${LYUBO_ID}, ${COLLECTION_ID})`;
			await db.sql`INSERT INTO tags (id, collection_id, name) VALUES (${TAG_ID}, ${COLLECTION_ID}, 'drama')`;
			await db.sql`INSERT INTO lyubo_tags (lyubo_id, tag_id) VALUES (${LYUBO_ID}, ${TAG_ID})`;

			await db.sql`DELETE FROM collections WHERE id = ${COLLECTION_ID}`;

			expect(await localWriteId('lyubo_local')).toBeUndefined();
			expect(await localWriteId('tags_local', TAG_ID)).toBeUndefined();
			expect(await relationWriteId()).toBeUndefined();
			expect((await readChangeLog(db)).map((c) => [c.table_name, c.operation])).toEqual([
				['collections', 'insert'],
				['lyubo', 'insert'],
				['tags', 'insert'],
				['lyubo_tags', 'insert'],
				['collections', 'delete']
			]);
		});

		it('keeps local edits of its synced records until the server deletes them', async () => {
			await syncIn(db, 'collections', [serverCollection()]);
			await syncIn(db, 'lyubo', [serverLyubo()]);
			await db.sql`UPDATE lyubo SET name = 'edited' WHERE id = ${LYUBO_ID}`;

			await db.sql`DELETE FROM collections WHERE id = ${COLLECTION_ID}`;

			expect(await localWriteId('lyubo_local')).toBeDefined();
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

describe('applyLocalSchema', () => {
	let oldDB: PGlite;

	const columns = async (table: string) =>
		(
			await oldDB.sql<{ column_name: string }>`
				SELECT column_name FROM information_schema.columns WHERE table_name = ${table}
			`
		).rows.map((r) => r.column_name);

	beforeEach(async () => {
		oldDB = await PGlite.create();
	});

	afterEach(async () => {
		await oldDB.close();
	});

	it('creates a database of another version again, without its rows', async () => {
		// A table as it was before schema versions existed
		await oldDB.exec(`
			CREATE TABLE lyubo_synced(id uuid PRIMARY KEY, watched_on text);
			INSERT INTO lyubo_synced VALUES ('${LYUBO_ID}', '2026-01-01');
		`);

		await applyLocalSchema(oldDB);

		const { rows } = await oldDB.sql`SELECT 1 FROM lyubo_synced`;

		expect(await columns('lyubo_synced')).toContain('collection_id');
		expect(rows).toHaveLength(0);
		expect((await oldDB.sql`SELECT schema_version FROM local_meta`).rows).toEqual([
			{ schema_version: LOCAL_SCHEMA_VERSION }
		]);
	});

	it('keeps the rows of a database of the current version', async () => {
		await applyLocalSchema(oldDB);
		await oldDB.sql`SELECT lyubo_synced_upsert(${JSON.stringify([serverLyubo()])}::jsonb)`;

		await applyLocalSchema(oldDB);

		expect((await oldDB.sql`SELECT 1 FROM lyubo_synced`).rows).toHaveLength(1);
	});
});
