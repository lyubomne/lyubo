import { PGlite } from '@electric-sql/pglite';
import { type PGliteWithLive, live } from '@electric-sql/pglite/live';
import { electricSync } from '@electric-sql/pglite-sync';

import localSchemaMigrations from './local-schema.sql?raw';

const DATA_DIR = 'idb://lyubo';

const registry = new Map<string, Promise<PGliteWithLive>>();

export default async function loadPGlite(): Promise<PGliteWithLive> {
	let loadingPromise = registry.get('loadingPromise');

	if (loadingPromise === undefined) {
		loadingPromise = _loadPGlite();

		registry.set('loadingPromise', loadingPromise);
	}

	return loadingPromise as Promise<PGliteWithLive>;
}

async function _loadPGlite(): Promise<PGliteWithLive> {
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

	return pglite;
}
