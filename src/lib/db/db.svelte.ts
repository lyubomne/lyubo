import { PGlite } from '@electric-sql/pglite';
import { type PGliteWithLive, live } from '@electric-sql/pglite/live';

import lyuboSchema from './schemas/lyubo.sql?raw';
import lyuboWithTagsSchema from './schemas/lyubo_with_tags.sql?raw';
import lyuboTagsSchema from './schemas/lyubo_tags.sql?raw';
import tagsSchema from './schemas/tags.sql?raw';
import changesSchema from './schemas/changes.sql?raw';
import triggersSchema from './schemas/triggers.sql?raw';
import { getContext, setContext } from 'svelte';
import type { TNillable } from '$lib/common/types';
import { RealtimeSync, SYNCED_TABLES } from './sync';

// PGlite 0.5 runs Postgres 18 and cannot open the Postgres 17 data of 'idb://lyubo'.
// The new database fills itself from Neon Realtime; unsent local changes in the old one are lost
const DATA_DIR = 'idb://lyubo-pg18';

class DBStore {
	db: TNillable<PGliteWithLive> = $state();

	async loadPGlite() {
		const pglite: PGliteWithLive = await PGlite.create(DATA_DIR, {
			extensions: {
				live
			}
		});

		await pglite.exec(changesSchema);
		await pglite.exec(triggersSchema);
		await pglite.exec(lyuboSchema);
		await pglite.exec(tagsSchema);
		await pglite.exec(lyuboTagsSchema);
		await pglite.exec(lyuboWithTagsSchema);

		void new RealtimeSync(pglite, SYNCED_TABLES).start();

		this.db = pglite;
	}
}

const DB_KEY = Symbol('db');

export const setDB = () => setContext(DB_KEY, new DBStore());
export const getDB = () => getContext<ReturnType<typeof setDB>>(DB_KEY);
