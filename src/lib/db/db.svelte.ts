import { PGlite } from '@electric-sql/pglite';
import { type PGliteWithLive, live } from '@electric-sql/pglite/live';

import { LOCAL_SCHEMAS } from './schemas';
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

		for (const schema of LOCAL_SCHEMAS) {
			await pglite.exec(schema);
		}

		void new RealtimeSync(pglite, SYNCED_TABLES).start();

		this.db = pglite;
	}
}

const DB_KEY = Symbol('db');

export const setDB = () => setContext(DB_KEY, new DBStore());
export const getDB = () => getContext<ReturnType<typeof setDB>>(DB_KEY);
