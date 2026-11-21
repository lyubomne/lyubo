import type { PGliteWithLive } from '@electric-sql/pglite/live';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createCollection, moveCollection } from './utils';

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
});
