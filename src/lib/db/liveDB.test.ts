import type { PGliteWithLive } from '@electric-sql/pglite/live';
import { query } from '@electric-sql/pglite/template';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLocalDB } from '$lib/testing';
import { startLiveQuery } from './liveDB.svelte';

describe('startLiveQuery', () => {
	let db: PGliteWithLive;

	// PGlite keeps a temporary view for every live query until it is unsubscribed
	const countLiveQueries = async () =>
		(
			await db.sql<{ count: number }>`
				SELECT count(*)::integer AS count FROM pg_class
				WHERE relkind = 'v' AND relname LIKE 'live_query_%_view'
			`
		).rows[0].count;

	beforeEach(async () => {
		db = await createLocalDB();
	});

	afterEach(async () => {
		await db.close();
	});

	it('ends a query that is stopped before it has started', async () => {
		const stop = startLiveQuery(db, query`SELECT id FROM collections`, vi.fn());

		await stop();

		expect(await countLiveQueries()).toBe(0);
	});

	it('ends a query that is stopped after its first result', async () => {
		const onResult = vi.fn();
		const stop = startLiveQuery(db, query`SELECT id FROM collections`, onResult);
		await vi.waitFor(() => expect(onResult).toHaveBeenCalled());

		await stop();

		expect(await countLiveQueries()).toBe(0);
	});
});
