import { PGlite } from '@electric-sql/pglite';
import { identifier } from '@electric-sql/pglite/template';
import type { PGliteWithLive } from '@electric-sql/pglite/live';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ColumnLimits } from '$lib/common/limits';
import { SYNCED_TABLES } from '$lib/db';
import { SERVER_SCHEMA } from '$lib/server/testing';
import { COLLECTION_ID, createLocalDB } from '$lib/testing';
import { TABLES } from '.';

// The same table is described in five places (local schema, server schema, SYNCED_TABLES,
// TABLES, live query). These tests fail when one of them drifts from the others
describe('synced table contract', () => {
	let localDB: PGliteWithLive;
	let serverDB: PGlite;

	const localColumns = async (table: string) =>
		(
			await localDB.sql<{ column_name: string }>`
				SELECT column_name FROM information_schema.columns WHERE table_name = ${table}
			`
		).rows
			.map((r) => r.column_name)
			.sort();
	const localPrimaryKey = async (table: string) =>
		(
			await localDB.sql<{ attname: string }>`
				SELECT a.attname
				FROM pg_index i
				JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
				WHERE i.indrelid = ${table}::regclass AND i.indisprimary
			`
		).rows
			.map((r) => r.attname)
			.sort();

	beforeAll(async () => {
		localDB = await createLocalDB();
		serverDB = await PGlite.create();
		await serverDB.exec(SERVER_SCHEMA);
	});

	afterAll(async () => {
		await localDB.close();
		await serverDB.close();
	});

	it('syncs exactly the tables the server describes', () => {
		const synced = SYNCED_TABLES.map((t) => t.table).sort();

		expect(Object.keys(TABLES).sort()).toEqual(synced);
	});

	describe.each(SYNCED_TABLES)('$table', ({ table, primaryKey }) => {
		it('has the same primary key in SYNCED_TABLES, TABLES and <table>_synced', async () => {
			const descriptor = TABLES[table];

			expect(descriptor.table).toBe(table);
			expect(descriptor.primaryKey).toEqual(primaryKey);
			expect(await localPrimaryKey(`${table}_synced`)).toEqual([...primaryKey].sort());
		});

		it('has a live query that runs on the server schema and selects the <table>_synced columns', async () => {
			const { sql, parameters } = TABLES[table].liveQuery;

			const { fields } = await serverDB.query(
				sql,
				parameters.map((p) => p.value)
			);

			expect(fields.map((f) => f.name).sort()).toEqual(await localColumns(`${table}_synced`));
		});
	});

	// The client validates against ColumnLimits; the server must accept exactly as much
	describe('column limits', () => {
		const limits = Object.entries(ColumnLimits).flatMap(([table, columns]) =>
			Object.entries(columns).map(([column, limit]) => ({ table, column, limit }))
		);
		// Rows of every table but `collections` belong to this collection
		const insert = (table: string, column: string, value: unknown) =>
			table === 'collections'
				? serverDB.sql`
						INSERT INTO collections (id, ${identifier`${column}`}) VALUES (gen_random_uuid(), ${value})
					`
				: serverDB.sql`
						INSERT INTO ${identifier`${table}`} (id, collection_id, ${identifier`${column}`})
						VALUES (gen_random_uuid(), ${COLLECTION_ID}, ${value})
					`;

		beforeAll(async () => {
			await serverDB.sql`INSERT INTO collections (id) VALUES (${COLLECTION_ID})`;
		});

		// Characters, not bytes: Cyrillic takes two bytes each in UTF-8
		it.each(limits)(
			'accepts $table.$column of $limit characters',
			async ({ table, column, limit }) => {
				const result = insert(table, column, 'ж'.repeat(limit));

				await expect(result).resolves.toBeDefined();
			}
		);

		it.each(limits)(
			'rejects $table.$column over $limit characters',
			async ({ table, column, limit }) => {
				const result = insert(table, column, 'a'.repeat(limit + 1));

				await expect(result).rejects.toMatchObject({ code: '23514' });
			}
		);

		it.each([
			{ rating: -0.1, isAccepted: false },
			{ rating: 0, isAccepted: true },
			{ rating: 10, isAccepted: true },
			{ rating: 10.1, isAccepted: false }
		])('accepts lyubo.rating $rating: $isAccepted', async ({ rating, isAccepted }) => {
			const result = insert('lyubo', 'rating', rating);

			await (isAccepted
				? expect(result).resolves.toBeDefined()
				: expect(result).rejects.toMatchObject({ code: '23514' }));
		});
	});
});
