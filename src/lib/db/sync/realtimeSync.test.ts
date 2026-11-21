import type { PGliteWithLive } from '@electric-sql/pglite/live';
import {
	type LiveQueryState,
	type RawLiveQuerySubscription,
	type RawLiveQueryUpdate,
	type RealtimeClient,
	type SealedLiveQuery,
	createRealtimeClient
} from '@neon/realtime/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import api from '$lib/api/client';
import { LYUBO_ID, OTHER_LYUBO_ID, createLocalDB, serverLyubo, serverLyuboTag } from '$lib/testing';
import { RealtimeSync } from './realtimeSync';
import { SYNCED_TABLES } from './tables';

// The network (sealing endpoint and Realtime client) is replaced, PGlite is real
vi.mock('$lib/api/client');
vi.mock('@neon/realtime/client', () => ({ createRealtimeClient: vi.fn() }));

type TRow = Record<string, unknown>;

const LYUBO_TABLE = SYNCED_TABLES.find((t) => t.table === 'lyubo')!;
const LYUBO_TAGS_TABLE = SYNCED_TABLES.find((t) => t.table === 'lyubo_tags')!;

const request = vi.mocked(api.request);
const sealed = (expiresAt: number): SealedLiveQuery<TRow> => ({
	capability: 'capability',
	queryFingerprint: 'fingerprint',
	expiresAt
});
const sealResponse = (expiresAt: number) =>
	Response.json({ url: 'wss://realtime.test', sealed: sealed(expiresAt) });
const rows = (...items: [rowId: string, row: TRow][]): RawLiveQueryUpdate<TRow> => ({
	type: 'rows',
	rows: items.map(([rowId, row]) => ({ rowId, row }))
});
const changes = (
	...items: ({ type: 'upsert'; rowId: string; row: TRow } | { type: 'remove'; rowId: string })[]
): RawLiveQueryUpdate<TRow> => ({ type: 'changes', changes: items, batch: { txids: ['1'] } });

describe('RealtimeSync', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.resetAllMocks();
		vi.restoreAllMocks();
	});

	describe('apply', () => {
		let db: PGliteWithLive;
		let sync: RealtimeSync;
		// The rowId -> primary key map one subscription keeps between updates
		let keys: Map<string, TRow>;

		const syncedLyubo = async () =>
			(await db.sql<{ id: string; name: string }>`SELECT id, name FROM lyubo_synced ORDER BY id`)
				.rows;

		beforeEach(async () => {
			db = await createLocalDB();
			sync = new RealtimeSync(db, SYNCED_TABLES);
			keys = new Map();
		});

		afterEach(async () => {
			await db.close();
		});

		it('replaces the synced table with a complete rows result', async () => {
			await sync.apply(
				LYUBO_TABLE,
				keys,
				rows(['r1', serverLyubo()], ['r2', serverLyubo({ id: OTHER_LYUBO_ID })])
			);

			await sync.apply(LYUBO_TABLE, keys, rows(['r1', serverLyubo({ name: 'kept' })]));

			expect(await syncedLyubo()).toEqual([{ id: LYUBO_ID, name: 'kept' }]);
		});

		it('upserts the rows of a changes update', async () => {
			await sync.apply(LYUBO_TABLE, keys, rows(['r1', serverLyubo({ name: 'old' })]));

			await sync.apply(
				LYUBO_TABLE,
				keys,
				changes(
					{ type: 'upsert', rowId: 'r1', row: serverLyubo({ name: 'new' }) },
					{ type: 'upsert', rowId: 'r2', row: serverLyubo({ id: OTHER_LYUBO_ID, name: 'added' }) }
				)
			);

			expect(await syncedLyubo()).toEqual([
				{ id: LYUBO_ID, name: 'new' },
				{ id: OTHER_LYUBO_ID, name: 'added' }
			]);
		});

		it('removes a row by the primary key remembered from an earlier update', async () => {
			await sync.apply(LYUBO_TABLE, keys, rows(['r1', serverLyubo()]));

			await sync.apply(LYUBO_TABLE, keys, changes({ type: 'remove', rowId: 'r1' }));

			expect(await syncedLyubo()).toEqual([]);
		});

		it('removes a row of a table with a composite primary key', async () => {
			await sync.apply(LYUBO_TAGS_TABLE, keys, rows(['r1', serverLyuboTag()]));

			await sync.apply(LYUBO_TAGS_TABLE, keys, changes({ type: 'remove', rowId: 'r1' }));

			const { rows: relations } = await db.sql`SELECT 1 FROM lyubo_tags_synced`;

			expect(relations).toHaveLength(0);
		});

		it.each([
			{
				order: 'upsert, then remove',
				batch: changes(
					{ type: 'upsert', rowId: 'r1', row: serverLyubo({ name: 'new' }) },
					{ type: 'remove', rowId: 'r1' }
				),
				expected: []
			},
			{
				order: 'remove, then upsert',
				batch: changes(
					{ type: 'remove', rowId: 'r1' },
					{ type: 'upsert', rowId: 'r1', row: serverLyubo({ name: 'new' }) }
				),
				expected: [{ id: LYUBO_ID, name: 'new' }]
			}
		])('applies only the last change of a row in a batch ($order)', async ({ batch, expected }) => {
			await sync.apply(LYUBO_TABLE, keys, rows(['r1', serverLyubo({ name: 'old' })]));

			await sync.apply(LYUBO_TABLE, keys, batch);

			expect(await syncedLyubo()).toEqual(expected);
		});

		it('ignores a remove of a row it has never seen', async () => {
			await sync.apply(LYUBO_TABLE, keys, rows(['r1', serverLyubo()]));

			await sync.apply(LYUBO_TABLE, keys, changes({ type: 'remove', rowId: 'unknown' }));

			expect(await syncedLyubo()).toEqual([{ id: LYUBO_ID, name: '' }]);
		});

		it('logs nothing to the change log', async () => {
			await sync.apply(LYUBO_TABLE, keys, rows(['r1', serverLyubo()]));

			const { rows: logged } = await db.sql`SELECT 1 FROM changes`;

			expect(logged).toHaveLength(0);
		});
	});

	describe('renewBeforeExpiry', () => {
		let sync: RealtimeSync;
		let renew: ReturnType<typeof vi.fn>;
		let subscription: RawLiveQuerySubscription<TRow>;

		beforeEach(() => {
			vi.useFakeTimers({ now: 0 });
			// Renewal never touches the DB
			sync = new RealtimeSync({} as PGliteWithLive, SYNCED_TABLES);
			renew = vi.fn().mockResolvedValue(undefined);
			subscription = { renew } as unknown as RawLiveQuerySubscription<TRow>;
		});

		it('renews the query 10 s before it expires', async () => {
			request.mockResolvedValue(sealResponse(120_000));
			sync.renewBeforeExpiry(subscription, sealed(60_000), LYUBO_TABLE);

			await vi.advanceTimersByTimeAsync(49_999);
			expect(renew).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(1);
			expect(request).toHaveBeenCalledWith('/api/sync/live', 'POST', { table: 'lyubo' });
			expect(renew).toHaveBeenCalledWith(sealed(120_000));
		});

		it('keeps renewing each new query before it expires', async () => {
			request
				.mockResolvedValueOnce(sealResponse(120_000))
				.mockResolvedValueOnce(sealResponse(180_000));
			sync.renewBeforeExpiry(subscription, sealed(60_000), LYUBO_TABLE);

			await vi.advanceTimersByTimeAsync(110_000);

			expect(renew).toHaveBeenNthCalledWith(1, sealed(120_000));
			expect(renew).toHaveBeenNthCalledWith(2, sealed(180_000));
		});

		it('retries sealing 1 s after a failed request', async () => {
			request
				.mockResolvedValueOnce(new Response(null, { status: 500 }))
				.mockResolvedValueOnce(sealResponse(120_000));
			sync.renewBeforeExpiry(subscription, sealed(60_000), LYUBO_TABLE);

			await vi.advanceTimersByTimeAsync(51_000);

			expect(request).toHaveBeenCalledTimes(2);
			expect(renew).toHaveBeenCalledWith(sealed(120_000));
		});

		it('stops renewing once the subscription rejects a renewal', async () => {
			request.mockImplementation(async () => sealResponse(Date.now() + 60_000));
			renew.mockRejectedValue(new Error('subscription closed'));
			sync.renewBeforeExpiry(subscription, sealed(60_000), LYUBO_TABLE);

			await vi.advanceTimersByTimeAsync(200_000);

			expect(renew).toHaveBeenCalledOnce();
		});

		it('stops renewing when its stop function is called', async () => {
			const stop = sync.renewBeforeExpiry(subscription, sealed(60_000), LYUBO_TABLE);

			stop();
			await vi.advanceTimersByTimeAsync(200_000);

			expect(request).not.toHaveBeenCalled();
		});
	});

	describe('restart', () => {
		let sync: RealtimeSync;
		let stateListeners: ((state: LiveQueryState) => void)[];
		let close: ReturnType<typeof vi.fn>;

		const failSubscription = () =>
			stateListeners[0]({ status: 'error', error: new Error('lost') } as LiveQueryState);

		beforeEach(() => {
			vi.useFakeTimers({ now: 0 });
			sync = new RealtimeSync({} as PGliteWithLive, SYNCED_TABLES);
			vi.spyOn(console, 'error').mockImplementation(() => {});
			stateListeners = [];
			close = vi.fn();
			request.mockImplementation(async () => sealResponse(60_000));
			vi.mocked(createRealtimeClient).mockImplementation(
				() =>
					({
						subscribe: () => ({
							onUpdate: () => () => {},
							onStateChange: (listener: (state: LiveQueryState) => void) => {
								stateListeners.push(listener);

								return () => {};
							},
							renew: vi.fn().mockResolvedValue(undefined),
							unsubscribe: vi.fn()
						}),
						close
					}) as unknown as RealtimeClient
			);
		});

		afterEach(() => {
			sync.stop();
		});

		it('subscribes every synced table on one client', async () => {
			await sync.start();

			expect(createRealtimeClient).toHaveBeenCalledOnce();
			expect(createRealtimeClient).toHaveBeenCalledWith({ url: 'wss://realtime.test' });
			expect(stateListeners).toHaveLength(SYNCED_TABLES.length);
		});

		it('closes the client as soon as a subscription fails', async () => {
			await sync.start();

			failSubscription();

			expect(close).toHaveBeenCalledOnce();
		});

		it('starts again from scratch 5 s after a subscription fails', async () => {
			await sync.start();

			failSubscription();

			await vi.advanceTimersByTimeAsync(4_999);
			expect(createRealtimeClient).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(1);
			expect(createRealtimeClient).toHaveBeenCalledTimes(2);
		});

		it('retries the start 5 s after sealing fails', async () => {
			request.mockResolvedValueOnce(new Response(null, { status: 500 }));

			await sync.start();
			await vi.advanceTimersByTimeAsync(5_000);

			expect(createRealtimeClient).toHaveBeenCalledOnce();
		});

		it('does not restart after it was stopped', async () => {
			await sync.start();

			failSubscription();
			sync.stop();
			await vi.advanceTimersByTimeAsync(10_000);

			expect(createRealtimeClient).toHaveBeenCalledOnce();
		});
	});
});
