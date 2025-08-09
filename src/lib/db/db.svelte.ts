import { PGlite } from '@electric-sql/pglite';
import { type PGliteWithLive, live } from '@electric-sql/pglite/live';
import { electricSync } from '@electric-sql/pglite-sync';

import localSchemaMigrations from './local-schema.sql?raw';
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

		await pglite.exec(localSchemaMigrations);

		await pglite.electric.syncShapeToTable({
			shape: {
				url: `http://localhost:5173/api/electric/shape`,
				params: {
					table: 'lyubo'
				}
			},
			shapeKey: 'lyubo',
			table: 'lyubo_synced',
			primaryKey: ['id']
		});

		this.db = pglite;
	}
}

const DB_KEY = Symbol('db');

export const setDB = () => setContext(DB_KEY, new DBStore());
export const getDB = () => getContext<ReturnType<typeof setDB>>(DB_KEY);
