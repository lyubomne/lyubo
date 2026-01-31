import { PGlite } from '@electric-sql/pglite';
import { type PGliteWithLive, live } from '@electric-sql/pglite/live';
import { electricSync } from '@electric-sql/pglite-sync';

import lyuboSchema from './schemas/lyubo.sql?raw';
import lyuboWithTagsSchema from './schemas/lyubo_with_tags.sql?raw';
import lyuboTagsSchema from './schemas/lyubo_tags.sql?raw';
import tagsSchema from './schemas/tags.sql?raw';
import changesSchema from './schemas/changes.sql?raw';
import triggersSchema from './schemas/triggers.sql?raw';
import { getContext, setContext } from 'svelte';
import type { TNillable } from '$lib/common/types';

const DATA_DIR = 'idb://lyubo';

class DBStore {
	db: TNillable<PGliteWithLive> = $state();

	async loadPGlite() {
		const pglite: PGliteWithLive = await PGlite.create(DATA_DIR, {
			extensions: {
				electric: electricSync(),
				live
			}
		});

		await pglite.exec(changesSchema);
		await pglite.exec(triggersSchema);
		await pglite.exec(lyuboSchema);
		await pglite.exec(tagsSchema);
		await pglite.exec(lyuboTagsSchema);
		await pglite.exec(lyuboWithTagsSchema);

		await pglite.electric.syncShapesToTables({
			shapes: {
				lyubo: {
					shape: {
						url: 'http://localhost:5173/api/electric/shape',
						params: { table: 'lyubo' }
					},
					table: 'lyubo_synced',
					primaryKey: ['id']
				},
				tags: {
					shape: {
						url: 'http://localhost:5173/api/electric/shape',
						params: { table: 'tags' }
					},
					table: 'tags_synced',
					primaryKey: ['id']
				},
				lyubo_tags: {
					shape: {
						url: 'http://localhost:5173/api/electric/shape',
						params: { table: 'lyubo_tags' }
					},
					table: 'lyubo_tags_synced',
					primaryKey: ['lyubo_id', 'tag_id']
				}
			},
			key: 'colections-sync'
		});

		this.db = pglite;
	}
}

const DB_KEY = Symbol('db');

export const setDB = () => setContext(DB_KEY, new DBStore());
export const getDB = () => getContext<ReturnType<typeof setDB>>(DB_KEY);
