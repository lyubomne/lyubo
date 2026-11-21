import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { type IServerDB, createServerDB } from '$lib/server/testing';
import {
	COLLECTION_ID,
	LYUBO_ID,
	OTHER_COLLECTION_ID,
	OTHER_TAG_ID,
	SERVER_WRITE_ID,
	TAG_ID,
	WRITE_ID,
	serverCollection,
	serverLyubo,
	serverTag
} from '$lib/testing';
import { ChangeRejectedError, applyChange } from './applyChange';
import { TABLES } from './tables';

type TChange = Omit<Parameters<typeof applyChange>[0], 'tx' | 'table'> & { table: string };

describe('applyChange', () => {
	let serverDB: IServerDB;

	const apply = ({ table, ...change }: TChange) =>
		serverDB.sql.begin((tx) => applyChange({ tx, table: TABLES[table], ...change }));
	const lyuboRows = () => serverDB.sql`SELECT id, name, rating, write_id FROM lyubo`;
	const count = async (table: 'collections' | 'lyubo' | 'tags' | 'lyubo_tags') =>
		(await serverDB.sql`SELECT 1 FROM ${serverDB.sql(table)}`).length;
	const seedCollection = (id = COLLECTION_ID) =>
		serverDB.sql`INSERT INTO collections ${serverDB.sql(serverCollection({ id }))}`;
	const seedLyubo = () => serverDB.sql`INSERT INTO lyubo ${serverDB.sql(serverLyubo())}`;
	const seedTag = (overrides: Parameters<typeof serverTag>[0] = {}) =>
		serverDB.sql`INSERT INTO tags ${serverDB.sql(serverTag(overrides))}`;
	const insertTag = (value: Record<string, unknown>) =>
		apply({ table: 'tags', operation: 'insert', value, write_id: WRITE_ID });
	const assignTag = (tagId: string) =>
		apply({
			table: 'lyubo_tags',
			operation: 'insert',
			value: { lyubo_id: LYUBO_ID, tag_id: tagId },
			write_id: WRITE_ID
		});

	beforeAll(async () => {
		serverDB = await createServerDB();
	});

	afterAll(async () => {
		await serverDB.close();
	});

	beforeEach(async () => {
		await serverDB.reset();
		await seedCollection();
	});

	describe('insert', () => {
		it('inserts the row with the write_id of the change', async () => {
			await apply({
				table: 'lyubo',
				operation: 'insert',
				value: { id: LYUBO_ID, collection_id: COLLECTION_ID, name: 'a' },
				write_id: WRITE_ID
			});

			expect(await lyuboRows()).toEqual([
				{ id: LYUBO_ID, name: 'a', rating: '0.0', write_id: WRITE_ID }
			]);
		});

		it('succeeds again when a batch is resent after a lost response', async () => {
			const change: TChange = {
				table: 'lyubo',
				operation: 'insert',
				value: { id: LYUBO_ID, collection_id: COLLECTION_ID, name: 'a' },
				write_id: WRITE_ID
			};
			await apply(change);

			await apply(change);

			expect(await lyuboRows()).toHaveLength(1);
		});

		it('ignores columns the table does not allow to write', async () => {
			await apply({
				table: 'lyubo',
				operation: 'insert',
				value: {
					id: LYUBO_ID,
					collection_id: COLLECTION_ID,
					name: 'a',
					unknown_column: 'x',
					write_id: SERVER_WRITE_ID
				},
				write_id: WRITE_ID
			});

			expect(await lyuboRows()).toEqual([expect.objectContaining({ write_id: WRITE_ID })]);
		});

		it('stores the collection of the record with a tag assignment', async () => {
			await seedLyubo();
			await seedTag();

			await assignTag(TAG_ID);

			expect(await serverDB.sql`SELECT collection_id FROM lyubo_tags`).toEqual([
				{ collection_id: COLLECTION_ID }
			]);
		});

		it('accepts a tag name that another collection already has', async () => {
			await seedCollection(OTHER_COLLECTION_ID);
			await seedTag({ name: 'Drama' });

			await insertTag({ id: OTHER_TAG_ID, collection_id: OTHER_COLLECTION_ID, name: 'Drama' });

			expect(await count('tags')).toBe(2);
		});
	});

	describe('update', () => {
		it('updates only the given columns and the write_id', async () => {
			await seedLyubo();

			await apply({
				table: 'lyubo',
				operation: 'update',
				value: { id: LYUBO_ID, rating: 7 },
				write_id: WRITE_ID
			});

			expect(await lyuboRows()).toEqual([
				{ id: LYUBO_ID, name: '', rating: '7.0', write_id: WRITE_ID }
			]);
		});

		it('accepts the collection_id a row already has', async () => {
			await seedLyubo();

			const result = apply({
				table: 'lyubo',
				operation: 'update',
				value: { id: LYUBO_ID, collection_id: COLLECTION_ID, name: 'b' },
				write_id: WRITE_ID
			});

			await expect(result).resolves.toBeUndefined();
		});
	});

	describe('delete', () => {
		it('deletes the row matched by a composite primary key', async () => {
			await seedLyubo();
			await seedTag();
			await assignTag(TAG_ID);

			await apply({
				table: 'lyubo_tags',
				operation: 'delete',
				value: { lyubo_id: LYUBO_ID, tag_id: TAG_ID },
				write_id: WRITE_ID
			});

			expect(await count('lyubo_tags')).toBe(0);
		});

		it('deletes the records, tags and assignments of a deleted collection', async () => {
			await seedLyubo();
			await seedTag();
			await assignTag(TAG_ID);

			await apply({
				table: 'collections',
				operation: 'delete',
				value: { id: COLLECTION_ID },
				write_id: WRITE_ID
			});

			expect(await count('lyubo')).toBe(0);
			expect(await count('tags')).toBe(0);
			expect(await count('lyubo_tags')).toBe(0);
		});
	});

	describe('rejected changes', () => {
		it('rejects a change without its primary key', async () => {
			const result = apply({
				table: 'lyubo_tags',
				operation: 'insert',
				value: { lyubo_id: LYUBO_ID },
				write_id: WRITE_ID
			});

			await expect(result).rejects.toThrow(ChangeRejectedError);
		});

		it('rejects an operation the table does not allow', async () => {
			const result = apply({
				table: 'lyubo_tags',
				operation: 'update',
				value: { lyubo_id: LYUBO_ID, tag_id: TAG_ID },
				write_id: WRITE_ID
			});

			await expect(result).rejects.toThrow(ChangeRejectedError);
		});

		// The endpoint answers 400 to Postgres errors of class 22 and 23
		describe('when the data breaks a constraint', () => {
			it('rejects a record without a collection', async () => {
				const result = apply({
					table: 'lyubo',
					operation: 'insert',
					value: { id: LYUBO_ID },
					write_id: WRITE_ID
				});

				await expect(result).rejects.toMatchObject({ code: '23502' });
			});

			it('rejects a tag of another collection on a record', async () => {
				await seedCollection(OTHER_COLLECTION_ID);
				await seedLyubo();
				await seedTag({ id: OTHER_TAG_ID, collection_id: OTHER_COLLECTION_ID });

				const result = assignTag(OTHER_TAG_ID);

				await expect(result).rejects.toMatchObject({ code: '23503' });
			});

			it('rejects a tag assignment of a record that does not exist', async () => {
				await seedTag();

				const result = assignTag(TAG_ID);

				await expect(result).rejects.toMatchObject({ code: '23502' });
			});

			it('rejects a second tag of the same name in one collection, in any case', async () => {
				await seedTag({ name: 'Drama' });

				const result = insertTag({ id: OTHER_TAG_ID, collection_id: COLLECTION_ID, name: 'drama' });

				await expect(result).rejects.toMatchObject({ code: '23505' });
			});

			it.each([
				{ table: 'lyubo', seed: () => seedLyubo(), id: LYUBO_ID },
				{ table: 'tags', seed: () => seedTag(), id: TAG_ID }
			])('rejects moving a row of $table to another collection', async ({ table, seed, id }) => {
				await seedCollection(OTHER_COLLECTION_ID);
				await seed();

				const result = apply({
					table,
					operation: 'update',
					value: { id, collection_id: OTHER_COLLECTION_ID },
					write_id: WRITE_ID
				});

				await expect(result).rejects.toMatchObject({ code: '23514' });
			});
		});
	});
});
