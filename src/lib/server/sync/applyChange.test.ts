import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { type IServerDB, createServerDB } from '$lib/server/testing';
import { LYUBO_ID, SERVER_WRITE_ID, TAG_ID, WRITE_ID, serverLyubo, serverTag } from '$lib/testing';
import { ChangeRejectedError, applyChange } from './applyChange';
import { TABLES } from './tables';

type TChange = Omit<Parameters<typeof applyChange>[0], 'tx' | 'table'> & { table: string };

describe('applyChange', () => {
	let serverDB: IServerDB;

	const apply = ({ table, ...change }: TChange) =>
		serverDB.sql.begin((tx) => applyChange({ tx, table: TABLES[table], ...change }));
	const lyuboRows = () => serverDB.sql`SELECT id, name, rating, write_id FROM lyubo`;
	const seedLyubo = () => serverDB.sql`INSERT INTO lyubo ${serverDB.sql(serverLyubo())}`;
	const seedTag = () => serverDB.sql`INSERT INTO tags ${serverDB.sql(serverTag())}`;

	beforeAll(async () => {
		serverDB = await createServerDB();
	});

	afterAll(async () => {
		await serverDB.close();
	});

	beforeEach(async () => {
		await serverDB.reset();
	});

	describe('insert', () => {
		it('inserts the row with the write_id of the change', async () => {
			await apply({
				table: 'lyubo',
				operation: 'insert',
				value: { id: LYUBO_ID, name: 'a' },
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
				value: { id: LYUBO_ID, name: 'a' },
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
				value: { id: LYUBO_ID, name: 'a', unknown_column: 'x', write_id: SERVER_WRITE_ID },
				write_id: WRITE_ID
			});

			expect(await lyuboRows()).toEqual([expect.objectContaining({ write_id: WRITE_ID })]);
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
	});

	describe('delete', () => {
		it('deletes the row matched by a composite primary key', async () => {
			await seedLyubo();
			await seedTag();
			await serverDB.sql`INSERT INTO lyubo_tags (lyubo_id, tag_id) VALUES (${LYUBO_ID}, ${TAG_ID})`;

			await apply({
				table: 'lyubo_tags',
				operation: 'delete',
				value: { lyubo_id: LYUBO_ID, tag_id: TAG_ID },
				write_id: WRITE_ID
			});

			expect(await serverDB.sql`SELECT 1 FROM lyubo_tags`).toHaveLength(0);
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
	});
});
