import type { PGliteInterface } from '@electric-sql/pglite';

import changesSchema from './changes.sql?raw';
import triggersSchema from './triggers.sql?raw';
import collectionsSchema from './collections.sql?raw';
import lyuboSchema from './lyubo.sql?raw';
import tagsSchema from './tags.sql?raw';
import lyuboTagsSchema from './lyubo_tags.sql?raw';
import lyuboWithTagsSchema from './lyubo_with_tags.sql?raw';

// Local SQL schemas in dependency order. The app and the tests run exactly this list
export const LOCAL_SCHEMAS = [
	changesSchema,
	triggersSchema,
	collectionsSchema,
	lyuboSchema,
	tagsSchema,
	lyuboTagsSchema,
	lyuboWithTagsSchema
] as const;

// Raise it with every change to LOCAL_SCHEMAS that cannot apply to an existing database, such as
// a new, renamed or retyped column: `CREATE TABLE IF NOT EXISTS` skips a table that exists.
// 1: before versions existed. 2: collections, `rated_on`
export const LOCAL_SCHEMA_VERSION = 2;

const LOCAL_META_SCHEMA = `
  CREATE TABLE IF NOT EXISTS local_meta(
    id boolean PRIMARY KEY DEFAULT TRUE CHECK (id),
    schema_version integer NOT NULL
  );
`;

/*
 * Create or update the local schema. A database of another version is dropped and created again:
 * the synced tables fill up from Neon Realtime, but changes that were not sent yet are lost.
 */
export const applyLocalSchema = async (db: PGliteInterface): Promise<void> => {
	await db.transaction(async (tx) => {
		await tx.exec(LOCAL_META_SCHEMA);

		const { rows } = await tx.sql<{ schema_version: number }>`
			SELECT schema_version FROM local_meta
		`;

		if (rows[0]?.schema_version !== LOCAL_SCHEMA_VERSION) {
			// Every table, view, function and trigger of the app lives in `public`
			await tx.exec(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
			await tx.exec(LOCAL_META_SCHEMA);
		}

		for (const schema of LOCAL_SCHEMAS) {
			await tx.exec(schema);
		}

		await tx.sql`
			INSERT INTO local_meta (schema_version) VALUES (${LOCAL_SCHEMA_VERSION})
			ON CONFLICT (id) DO UPDATE SET schema_version = EXCLUDED.schema_version
		`;
	});
};
