import type { PGliteWithLive } from '@electric-sql/pglite/live';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ZodError } from 'zod';

import { createCollection, moveCollection, parseSortKey, sortCollection } from './utils';

import {
	COLLECTION_ID,
	OTHER_COLLECTION_ID,
	createLocalDB,
	readChangeLog,
	serverCollection,
	syncIn
} from '$lib/testing';

const THIRD_COLLECTION_ID = '00000000-0000-4000-8000-000000000007';

let db: PGliteWithLive;

const readRack = async () =>
	(
		await db.sql<{ id: string; position: number }>`
			SELECT id, position FROM collections ORDER BY position, created_at
		`
	).rows;

describe('parseSortKey', () => {
	it.each([
		{ key: 'name asc', expected: { column: 'name', direction: 'asc' } },
		{ key: 'rated_on desc', expected: { column: 'rated_on', direction: 'desc' } },
		{ key: '', expected: null },
		{ key: 'name', expected: null },
		{ key: 'name up', expected: null }
	])('reads "$key"', ({ key, expected }) => {
		expect(parseSortKey(key)).toEqual(expected);
	});
});

describe('collection panel utils', () => {
	beforeEach(async () => {
		db = await createLocalDB();
	});

	afterEach(async () => {
		await db.close();
	});

	describe('createCollection', () => {
		it('puts a new collection after the last one in the rack', async () => {
			await syncIn(db, 'collections', [serverCollection({ position: 4 })]);

			const id = await createCollection({ db });

			expect(await readRack()).toEqual([
				{ id: COLLECTION_ID, position: 4 },
				{ id, position: 5 }
			]);
		});

		it('starts an empty rack at position 0', async () => {
			const id = await createCollection({ db });

			expect(await readRack()).toEqual([{ id, position: 0 }]);
		});
	});

	describe('moveCollection', () => {
		it('swaps collections that share a position, logging only the rows that moved', async () => {
			// All three have the default position; created_at alone orders them
			await syncIn(db, 'collections', [
				serverCollection({ id: COLLECTION_ID, created_at: '2026-01-01T00:00:00.000Z' }),
				serverCollection({ id: OTHER_COLLECTION_ID, created_at: '2026-01-02T00:00:00.000Z' }),
				serverCollection({ id: THIRD_COLLECTION_ID, created_at: '2026-01-03T00:00:00.000Z' })
			]);

			await moveCollection({ db, collections: await readRack(), id: COLLECTION_ID, offset: 1 });

			expect((await readRack()).map((collection) => collection.id)).toEqual([
				OTHER_COLLECTION_ID,
				COLLECTION_ID,
				THIRD_COLLECTION_ID
			]);
			expect(
				(await readChangeLog(db)).map((change) => [change.primary_key.id, change.value])
			).toEqual([
				[COLLECTION_ID, { position: 1 }],
				[THIRD_COLLECTION_ID, { position: 2 }]
			]);
		});

		it.each([
			{ name: 'the first one to the left', id: COLLECTION_ID, offset: -1 },
			{ name: 'the last one to the right', id: OTHER_COLLECTION_ID, offset: 1 }
		])('leaves the rack as it is when moving $name', async ({ id, offset }) => {
			await syncIn(db, 'collections', [
				serverCollection({ id: COLLECTION_ID, position: 0 }),
				serverCollection({ id: OTHER_COLLECTION_ID, position: 1 })
			]);

			await moveCollection({ db, collections: await readRack(), id, offset });

			expect(await readChangeLog(db)).toEqual([]);
		});
	});

	describe('sortCollection', () => {
		it('logs the column and the direction as one change', async () => {
			await syncIn(db, 'collections', [serverCollection()]);

			await sortCollection({ db, id: COLLECTION_ID, sort: { column: 'name', direction: 'asc' } });

			expect((await readChangeLog(db)).map((change) => change.value)).toEqual([
				{ sort_column: 'name', sort_direction: 'asc' }
			]);
		});

		it('clears both columns for the default order', async () => {
			await syncIn(db, 'collections', [
				serverCollection({ sort_column: 'name', sort_direction: 'desc' })
			]);

			await sortCollection({ db, id: COLLECTION_ID, sort: null });

			expect((await readChangeLog(db)).map((change) => change.value)).toEqual([
				{ sort_column: null, sort_direction: null }
			]);
		});

		it('writes nothing for a column the server does not sort by', async () => {
			await syncIn(db, 'collections', [serverCollection()]);

			const sort = () =>
				sortCollection({ db, id: COLLECTION_ID, sort: { column: 'review', direction: 'asc' } });

			expect(sort).toThrow(ZodError);
			expect(await readChangeLog(db)).toEqual([]);
		});
	});
});
