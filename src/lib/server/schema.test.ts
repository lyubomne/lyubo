import { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SERVER_SCHEMA } from '$lib/server/testing';
import { LYUBO_ID, TAG_ID } from '$lib/testing';

// In file name order: 000_initial.sql is the schema of branches created before migrations existed
const MIGRATIONS = Object.entries(
	import.meta.glob<string>('/neon/migrations/*.sql', {
		query: '?raw',
		import: 'default',
		eager: true
	})
)
	.sort(([a], [b]) => a.localeCompare(b))
	.map(([, sql]) => sql);

const [INITIAL_SCHEMA, ...UPGRADES] = MIGRATIONS;

// Everything Postgres stores about the tables, independent of creation order
const describeSchema = async (db: PGlite) => ({
	columns: (
		await db.query(`
			SELECT table_name, column_name, data_type, is_nullable, column_default
			FROM information_schema.columns WHERE table_schema = 'public'
			ORDER BY table_name, column_name
		`)
	).rows,
	constraints: (
		await db.query(`
			SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS def
			FROM pg_constraint WHERE connamespace = 'public'::regnamespace
			ORDER BY table_name, conname
		`)
	).rows,
	indexes: (
		await db.query(`
			SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname
		`)
	).rows,
	triggers: (
		await db.query(`
			SELECT tgname, pg_get_triggerdef(oid) AS def FROM pg_trigger
			WHERE NOT tgisinternal ORDER BY tgname
		`)
	).rows
});

// A branch is upgraded by its migrations, then `neon/schema.sql` (neon/README.md)
const upgrade = async (db: PGlite) => {
	for (const migration of UPGRADES) {
		await db.exec(migration);
	}

	await db.exec(SERVER_SCHEMA);
};

describe('server schema', () => {
	let upgradedDB: PGlite;
	let freshDB: PGlite;

	beforeEach(async () => {
		upgradedDB = await PGlite.create();
		freshDB = await PGlite.create();
		await upgradedDB.exec(INITIAL_SCHEMA);
	});

	afterEach(async () => {
		await upgradedDB.close();
		await freshDB.close();
	});

	it('is the same after the migrations as when created from neon/schema.sql', async () => {
		await upgrade(upgradedDB);
		await freshDB.exec(SERVER_SCHEMA);

		expect(await describeSchema(upgradedDB)).toEqual(await describeSchema(freshDB));
	});

	it('keeps the rows of a branch and moves them into one collection', async () => {
		await upgradedDB.exec(`
			INSERT INTO lyubo (id, name, watched_on) VALUES ('${LYUBO_ID}', 'a', '2026-02-03');
			INSERT INTO tags (id, name) VALUES ('${TAG_ID}', 'b');
			INSERT INTO lyubo_tags (lyubo_id, tag_id) VALUES ('${LYUBO_ID}', '${TAG_ID}');
		`);

		await upgrade(upgradedDB);

		const [collection] = (await upgradedDB.query<{ id: string }>(`SELECT id FROM collections`))
			.rows;
		const query = async (sql: string) => (await upgradedDB.query(sql)).rows;

		expect(await query(`SELECT count(*)::int AS count FROM collections`)).toEqual([{ count: 1 }]);
		expect(await query(`SELECT collection_id, name, rated_on::text FROM lyubo`)).toEqual([
			{ collection_id: collection.id, name: 'a', rated_on: '2026-02-03' }
		]);
		expect(await query(`SELECT collection_id, name FROM tags`)).toEqual([
			{ collection_id: collection.id, name: 'b' }
		]);
		expect(await query(`SELECT collection_id FROM lyubo_tags`)).toEqual([
			{ collection_id: collection.id }
		]);
	});
});
